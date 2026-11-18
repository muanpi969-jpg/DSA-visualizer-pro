#!/usr/bin/env python3
"""
audio_to_tab.py
===============

Transcribe an **isolated bass or guitar stem** into clean ASCII tablature.

Pipeline
--------
    WAV stem
      │  1. ingest            librosa.load / scipy.io.wavfile  -> mono float32
      │  2. pitch track       librosa.pyin (pYIN)  |  CREPE  |  built-in YIN
      │  3. onset detect      librosa.onset        |  spectral-flux fallback
      │  4. segment           onsets + f0  -> a monophonic list of MIDI notes
      │  5. quantize          snap onsets to a 16th-note grid (tempo aware)
      │  6. fretboard map     Viterbi decoding over a physical-playability cost
      │  7. render            -> ASCII tab
      ▼
    tab

The interesting part is step 6 — turning a stream of *frequencies* into a stream
of *(string, fret)* positions.  A given pitch can usually be played in several
places on the neck (e.g. concert A4 = 440 Hz lives at G-string fret 14, B-string
fret 10, high-E fret 5 …).  We pick the sequence of positions that a human would
actually play by minimising a physical-effort cost with the Viterbi algorithm.
The cost model and its matrix formulation are documented in detail in
``FretboardMapper`` below.

Dependencies
------------
Primary path uses ``librosa`` (and optionally ``crepe``).  If neither is present
the script transparently falls back to a self-contained NumPy implementation of
YIN pitch tracking and spectral-flux onset detection, so it always runs.

    pip install librosa            # recommended (pYIN, robust onsets, tempo)
    pip install crepe tensorflow   # optional neural pitch tracker

Usage
-----
    python audio_to_tab.py riff.wav --instrument guitar --bpm 120
    python audio_to_tab.py bassline.wav --instrument bass --tracker pyin
    python audio_to_tab.py --self-test          # synthesize + transcribe a demo
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Tuple

import numpy as np

# ---- optional heavy deps, imported lazily / defensively --------------------
try:
    import librosa
    _HAVE_LIBROSA = True
except Exception:  # pragma: no cover - environment dependent
    _HAVE_LIBROSA = False

try:
    from scipy.io import wavfile as _wavfile
    _HAVE_SCIPY = True
except Exception:  # pragma: no cover
    _HAVE_SCIPY = False


# ===========================================================================
# 1.  MUSIC-THEORY HELPERS
# ===========================================================================
_PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def hz_to_midi(f_hz: np.ndarray | float) -> np.ndarray | float:
    """Convert frequency in Hz to (fractional) MIDI note number.

    m = 69 + 12 * log2(f / 440).  A4 = 440 Hz = MIDI 69.
    """
    return 69.0 + 12.0 * np.log2(np.asarray(f_hz, dtype=float) / 440.0)


def midi_to_hz(m: float) -> float:
    return 440.0 * 2.0 ** ((m - 69.0) / 12.0)


def midi_to_name(m: int, with_octave: bool = True) -> str:
    pc = _PITCH_CLASSES[int(m) % 12]
    return f"{pc}{int(m) // 12 - 1}" if with_octave else pc


# ===========================================================================
# 2.  INSTRUMENT + COST CONFIGURATION
# ===========================================================================
@dataclass(frozen=True)
class Instrument:
    """An instrument is fully described by its open-string MIDI pitches.

    ``open_strings`` is ordered low-pitch → high-pitch (index 0 is the thickest,
    lowest-sounding string), which is also the natural row order for the cost
    model.  ``n_frets`` bounds the playable region.
    """
    name: str
    open_strings: Tuple[int, ...]
    n_frets: int = 24

    @property
    def n_strings(self) -> int:
        return len(self.open_strings)


# Standard tunings, as open-string MIDI numbers.
#   Bass  E1 A1 D2 G2  -> 28 33 38 43
#   Guitar E2 A2 D3 G3 B3 E4 -> 40 45 50 55 59 64
INSTRUMENTS = {
    "bass": Instrument("Bass (E A D G)", (28, 33, 38, 43), n_frets=24),
    "guitar": Instrument("Guitar (E A D G B E)", (40, 45, 50, 55, 59, 64), n_frets=22),
}


@dataclass(frozen=True)
class CostConfig:
    """Weights for the fretboard playability cost (see ``FretboardMapper``).

    Tuning these changes the "personality" of the transcriber.  Defaults bias
    toward compact, single-position playing (pentatonic-box friendly).
    """
    # --- emission (per-note) ---
    w_fret_open_bonus: float = 1.0   # reward open strings (they ring, free finger)
    w_fret_low: float = 0.15         # mild preference for lower frets
    w_fret_high_thresh: int = 12     # frets beyond here are "up the neck"
    w_fret_high_quad: float = 0.08   # quadratic penalty above the threshold

    # --- transition (note-to-note hand movement) ---
    w_fret_lin: float = 1.0          # linear horizontal travel
    w_fret_quad: float = 1.2         # *quadratic* travel — punishes erratic jumps
    hand_span: int = 4               # frets the 4 fingers cover without shifting
    w_span: float = 2.5              # extra cost once a move exceeds the hand span
    w_string: float = 0.6            # vertical string crossing (cheap, adjacent ok)
    w_string_quad: float = 0.25      # extra for crossing many strings at once
    open_discount: float = 0.4       # open strings don't anchor the hand -> discount


# ===========================================================================
# 3.  AUDIO FRONT END  (ingest + pitch + onsets)
# ===========================================================================
@dataclass
class FrontEndResult:
    f0_hz: np.ndarray          # per-frame fundamental (NaN where unvoiced)
    times: np.ndarray          # frame timestamps (s)
    onsets: np.ndarray         # onset times (s)
    sr: int
    duration: float


class AudioFrontEnd:
    """Loads a stem and extracts frame-wise pitch and note onsets.

    ``tracker`` selects the pitch algorithm: ``"pyin"`` (default, librosa),
    ``"crepe"`` (neural, if installed), or ``"yin"`` (built-in NumPy fallback).
    """

    def __init__(self, sr: int = 22050, hop_length: int = 256,
                 fmin: float = 30.0, fmax: float = 1200.0, tracker: str = "pyin"):
        self.sr = sr
        self.hop = hop_length
        self.fmin = fmin
        self.fmax = fmax
        self.tracker = tracker

    # -- ingest -------------------------------------------------------------
    def load(self, path: str) -> np.ndarray:
        if _HAVE_LIBROSA:
            y, _ = librosa.load(path, sr=self.sr, mono=True)
            return y.astype(np.float32)
        if _HAVE_SCIPY:
            sr, y = _wavfile.read(path)
            y = y.astype(np.float32)
            if y.ndim > 1:                       # stereo -> mono
                y = y.mean(axis=1)
            if np.issubdtype(y.dtype, np.integer):
                y /= np.iinfo(y.dtype).max
            y /= (np.max(np.abs(y)) + 1e-9)
            if sr != self.sr:                    # naive resample
                idx = np.linspace(0, len(y) - 1, int(len(y) * self.sr / sr))
                y = np.interp(idx, np.arange(len(y)), y)
            return y.astype(np.float32)
        raise RuntimeError("Need librosa or scipy to read audio.")

    # -- pitch --------------------------------------------------------------
    def track_pitch(self, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        if self.tracker == "crepe":
            return self._pitch_crepe(y)
        if self.tracker == "pyin" and _HAVE_LIBROSA:
            return self._pitch_pyin(y)
        return self._pitch_yin(y)

    def _pitch_pyin(self, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """librosa pYIN — probabilistic YIN with Viterbi-smoothed voicing.

        pYIN is robust to vibrato and fast lines because it tracks a distribution
        over candidate periods rather than committing greedily.
        """
        f0, _, _ = librosa.pyin(
            y, fmin=self.fmin, fmax=self.fmax, sr=self.sr,
            frame_length=2048, hop_length=self.hop, fill_na=np.nan,
        )
        times = librosa.times_like(f0, sr=self.sr, hop_length=self.hop)
        return f0, times

    def _pitch_crepe(self, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:  # pragma: no cover
        """Optional neural tracker.  Requires `pip install crepe tensorflow`."""
        try:
            import crepe
        except Exception as e:
            raise RuntimeError("CREPE not installed (pip install crepe tensorflow).") from e
        t, f0, conf, _ = crepe.predict(y, self.sr, viterbi=True, step_size=1000 * self.hop / self.sr)
        f0 = np.where(conf > 0.5, f0, np.nan)        # gate on confidence
        return f0, t

    def _pitch_yin(self, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Self-contained YIN (de Cheveigné & Kawahara 2002), pure NumPy.

        For each frame:
          1. difference function      d(τ) = Σ_n (x[n] − x[n+τ])²
          2. cumulative-mean-normalised difference  d'(τ) = d(τ) / ((1/τ) Σ d)
          3. absolute threshold       first τ with d'(τ) < 0.1 (else global min)
          4. parabolic interpolation  around that τ for sub-sample precision
          f0 = sr / τ*
        """
        frame_len = 2048
        tau_min = max(2, int(self.sr / self.fmax))
        tau_max = min(frame_len // 2, int(self.sr / self.fmin) + 1)
        W = frame_len - tau_max                       # integration window length
        n_frames = 1 + max(0, (len(y) - frame_len) // self.hop)
        f0 = np.full(n_frames, np.nan)
        for i in range(n_frames):
            x = y[i * self.hop: i * self.hop + frame_len]
            if len(x) < frame_len or np.max(np.abs(x)) < 1e-3:
                continue
            # YIN difference function with a FIXED integration window of length W:
            #   d(τ) = Σ_{n<W} (x[n] − x[n+τ])²
            #        = Σ x[n]²  +  Σ x[n+τ]²  −  2 Σ x[n]·x[n+τ]
            #        =   E0     +   term2(τ)  −     2·term3(τ)
            # term2 is a sliding window energy (via prefix sums); term3 is the
            # cross-correlation of the first W samples against the frame.
            pe = np.concatenate(([0.0], np.cumsum(x * x)))     # prefix energy
            taus = np.arange(tau_max + 1)
            E0 = pe[W]
            term2 = pe[taus + W] - pe[taus]                    # Σ x[n+τ]²
            term3 = np.correlate(x, x[:W], mode="valid")[: tau_max + 1]
            d = E0 + term2 - 2.0 * term3
            # cumulative mean normalisation
            d_prime = np.ones_like(d)
            running = np.cumsum(d[1:])
            d_prime[1:] = d[1:] * np.arange(1, len(d)) / np.maximum(running, 1e-9)
            # absolute threshold
            cand = np.where(d_prime[tau_min:] < 0.1)[0]
            tau = (cand[0] + tau_min) if len(cand) else (np.argmin(d_prime[tau_min:]) + tau_min)
            # parabolic interpolation around tau
            if 1 <= tau < tau_max:
                a, b, c = d_prime[tau - 1], d_prime[tau], d_prime[tau + 1]
                denom = a + c - 2 * b
                shift = 0.5 * (a - c) / denom if abs(denom) > 1e-9 else 0.0
                tau = tau + shift
            if tau > 0:                                  # accept only valid periods
                f = self.sr / tau
                if self.fmin <= f <= self.fmax:          # ...within instrument range
                    f0[i] = f
        times = (np.arange(n_frames) * self.hop + frame_len / 2) / self.sr
        return f0, times

    # -- onsets -------------------------------------------------------------
    def detect_onsets(self, y: np.ndarray) -> np.ndarray:
        if _HAVE_LIBROSA:
            return librosa.onset.onset_detect(
                y=y, sr=self.sr, hop_length=self.hop, units="time", backtrack=True)
        return self._onsets_spectral_flux(y)

    def _onsets_spectral_flux(self, y: np.ndarray) -> np.ndarray:
        """Spectral-flux onset detector: sum of positive bin-wise magnitude
        increases between STFT frames, then peak-pick above an adaptive median."""
        frame_len, hop = 1024, self.hop
        win = np.hanning(frame_len)
        n = 1 + (len(y) - frame_len) // hop
        mags = np.empty((n, frame_len // 2 + 1))
        for i in range(n):
            seg = y[i * hop: i * hop + frame_len] * win
            mags[i] = np.abs(np.fft.rfft(seg))
        flux = np.maximum(0.0, np.diff(mags, axis=0)).sum(axis=1)
        flux = np.concatenate(([0.0], flux))
        flux /= (flux.max() + 1e-9)
        thresh = np.median(flux) + 0.12
        peaks = []
        for i in range(1, len(flux) - 1):
            if flux[i] > thresh and flux[i] >= flux[i - 1] and flux[i] > flux[i + 1]:
                peaks.append(i)
        return np.array(peaks) * hop / self.sr

    # -- orchestrate --------------------------------------------------------
    def analyze(self, path: Optional[str] = None, y: Optional[np.ndarray] = None) -> FrontEndResult:
        if y is None:
            y = self.load(path)
        f0, times = self.track_pitch(y)
        onsets = self.detect_onsets(y)
        return FrontEndResult(f0, times, onsets, self.sr, len(y) / self.sr)


# ===========================================================================
# 4.  NOTE SEGMENTATION  (onsets + pitch  ->  discrete MIDI notes)
# ===========================================================================
@dataclass
class Note:
    midi: int
    onset: float          # seconds
    duration: float       # seconds
    # filled in later by quantization / mapping:
    cell: int = -1        # grid index
    string: int = -1
    fret: int = -1


def segment_notes(fe: FrontEndResult, min_voiced_frac: float = 0.25) -> List[Note]:
    """Collapse frame-wise pitch into one MIDI note per onset interval.

    For each interval [onset_k, onset_{k+1}) we take the *median* of the voiced
    f0 frames inside it (median is robust to vibrato, glides, and octave
    glitches) and round to the nearest semitone.  Intervals that are mostly
    unvoiced become rests (dropped).
    """
    onsets = list(fe.onsets)
    if not len(onsets):
        return []
    bounds = onsets + [fe.duration]
    notes: List[Note] = []
    for k in range(len(onsets)):
        t0, t1 = bounds[k], bounds[k + 1]
        sel = (fe.times >= t0) & (fe.times < max(t1, t0 + 1e-3))
        seg = fe.f0_hz[sel]
        voiced = seg[np.isfinite(seg) & (seg > 0)]       # finite, positive Hz only
        if len(seg) == 0 or len(voiced) < max(1, min_voiced_frac * len(seg)):
            continue                                   # rest
        midi = int(np.round(hz_to_midi(np.median(voiced))))
        notes.append(Note(midi=midi, onset=t0, duration=max(t1 - t0, 1e-3)))
    return notes


# ===========================================================================
# 5.  TIME QUANTIZATION  (snap onsets to a rhythmic grid)
# ===========================================================================
def quantize(notes: List[Note], bpm: float, subdivisions: int = 4,
             beats_per_measure: int = 4) -> Tuple[List[Note], int]:
    """Snap each note onset to the nearest grid cell.

    ``subdivisions`` is the number of cells per beat (4 → sixteenth-note grid,
    2 → eighth-note grid).  Returns the notes with ``.cell`` populated and the
    number of cells in a measure.

    cell_duration = (60 / bpm) / subdivisions
    cell_index    = round((onset − t0) / cell_duration)
    """
    if not notes:
        return notes, subdivisions * beats_per_measure
    cell_dur = (60.0 / bpm) / subdivisions
    t0 = notes[0].onset
    last = -1
    for n in notes:
        c = int(round((n.onset - t0) / cell_dur))
        if c <= last:           # avoid collisions on the grid (monophonic)
            c = last + 1
        n.cell = c
        last = c
    return notes, subdivisions * beats_per_measure


# ===========================================================================
# 6.  FRETBOARD MAPPING  —  the heart of the tool
# ===========================================================================
class FretboardMapper:
    r"""Assign every detected MIDI note a physically sensible ``(string, fret)``.

    THE PROBLEM
    -----------
    A pitch *p* can be produced at every position ``(s, f)`` for which
    ``open_strings[s] + f == p`` and ``0 ≤ f ≤ n_frets``.  Across a melody of
    *T* notes there are ∏ₜ|Cₜ| possible fingerings.  We want the single path
    that a competent player would choose: compact, smooth, and idiomatic.

    THE MODEL  (a 1st-order Hidden-Markov / shortest-path problem)
    -------------------------------------------------------------
    We score a candidate path with two additive terms and minimise the total:

        J(path) = Σₜ  E(pₜ)              ← *emission* / local cost
                + Σₜ  T(pₜ₋₁, pₜ)        ← *transition* / movement cost

    EMISSION  E(s, f)   — how awkward is this single position in isolation?
        E(s, f) =   w_low · f                         (lower frets read easier)
                  + w_hq  · max(0, f − F_hi)²          (penalise far up the neck)
                  − w_open · 1[f = 0]                  (open strings are "free")

    TRANSITION  T(p₁, p₂)  — how far must the fretting hand travel?
        Let  Δf = |f₂ − f₁|   (horizontal, *along* the neck)
             Δs = |s₂ − s₁|   (vertical, *across* strings)

        T =  g · ( w_flin·Δf + w_fquad·Δf² )          horizontal travel
           + w_span · max(0, Δf − span)               leaving the 4-fret hand box
           + w_slin·Δs + w_squad·max(0, Δs−1)²        string crossing

      where g = open_discount if either position is an open string (the hand is
      not anchored, so the "jump" is nearly free), else 1.

    WHY THIS PRODUCES IDIOMATIC TABS
    --------------------------------
    * The **Δf² term** dominates for large horizontal jumps, so the same pitch
      reachable 12 frets away is rejected in favour of a nearby fingering — this
      is exactly what keeps a melody inside one *position* / pentatonic box.
    * **max(0, Δf − span)** encodes that four fingers cover ~4 frets for free;
      only movement *beyond* the box is charged the steep ``w_span`` rate.
    * Δs is cheap and only mildly super-linear, so the optimiser happily hops to
      **adjacent strings** to stay in the box instead of sliding up one string.
    * The open-string discount stops the model from absurdly penalising the
      natural use of open strings between phrases.

    SOLVING IT  (Viterbi, as explicit matrix operations)
    ----------------------------------------------------
    With ``eₜ ∈ ℝ^{|Cₜ|}`` the emission vector and ``Mₜ ∈ ℝ^{|Cₜ₋₁|×|Cₜ|}`` the
    transition matrix (``Mₜ[i, j] = T(Cₜ₋₁[i], Cₜ[j])``), the min-cost-to-here
    vector ``Dₜ`` obeys the recurrence

        D₀     = e₀
        Dₜ[j]  = eₜ[j] + minᵢ ( Dₜ₋₁[i] + Mₜ[i, j] )
        Bₜ[j]  =        argminᵢ ( Dₜ₋₁[i] + Mₜ[i, j] )      (back-pointer)

    which vectorises to a single broadcast-and-reduce per step:

        P     = Dₜ₋₁[:, None] + Mₜ        # shape (|Cₜ₋₁|, |Cₜ|)
        Dₜ    = eₜ + P.min(axis=0)
        Bₜ    =      P.argmin(axis=0)

    The optimal fingering is recovered by back-tracking the ``Bₜ`` from
    ``argmin Dₜ₋₁``.  Complexity is Σₜ |Cₜ₋₁|·|Cₜ| ≈ O(T · S²) — linear in notes.
    """

    def __init__(self, instrument: Instrument, cfg: CostConfig = CostConfig()):
        self.inst = instrument
        self.cfg = cfg

    # ---- candidate positions for one pitch -------------------------------
    def candidates(self, midi: int) -> List[Tuple[int, int]]:
        """All playable ``(string, fret)`` for ``midi``.

        If the pitch is out of range we try octave shifts (±1, ±2) — a common
        rescue for octave errors from the pitch tracker — and use the first
        shift that yields any position.
        """
        for shift in (0, -12, 12, -24, 24):
            m = midi + shift
            cands = [(s, m - open_m)
                     for s, open_m in enumerate(self.inst.open_strings)
                     if 0 <= m - open_m <= self.inst.n_frets]
            if cands:
                return cands
        return []

    # ---- EMISSION cost  E(s, f) ------------------------------------------
    def emission(self, cands: Sequence[Tuple[int, int]]) -> np.ndarray:
        c = self.cfg
        out = np.empty(len(cands))
        for i, (_s, f) in enumerate(cands):
            cost = c.w_fret_low * f
            if f > c.w_fret_high_thresh:
                cost += c.w_fret_high_quad * (f - c.w_fret_high_thresh) ** 2
            if f == 0:
                cost -= c.w_fret_open_bonus
            out[i] = cost
        return out

    # ---- TRANSITION matrix  M[i, j] = T(prev_i, cur_j) -------------------
    def transition_matrix(self, prev: Sequence[Tuple[int, int]],
                          cur: Sequence[Tuple[int, int]]) -> np.ndarray:
        """Vectorised construction of the |prev|×|cur| movement-cost matrix.

        We lay out the prev positions down the rows and cur positions across the
        columns, then compute every pairwise cost with NumPy broadcasting (no
        Python loop over the |prev|·|cur| pairs).
        """
        c = self.cfg
        ps = np.array([s for s, _ in prev])[:, None]   # (P, 1)
        pf = np.array([f for _, f in prev])[:, None]    # (P, 1)
        cs = np.array([s for s, _ in cur])[None, :]     # (1, C)
        cf = np.array([f for _, f in cur])[None, :]     # (1, C)

        dfret = np.abs(cf - pf)                          # (P, C)
        dstring = np.abs(cs - ps)

        # open strings (fret 0) don't anchor the hand -> discount horizontal move
        open_either = (pf == 0) | (cf == 0)
        g = np.where(open_either, c.open_discount, 1.0)

        horiz = g * (c.w_fret_lin * dfret + c.w_fret_quad * dfret ** 2)
        span = c.w_span * np.maximum(0, dfret - c.hand_span)
        vert = c.w_string * dstring + c.w_string_quad * np.maximum(0, dstring - 1) ** 2
        return horiz + span + vert

    # ---- VITERBI ----------------------------------------------------------
    def map_notes(self, notes: List[Note]) -> Tuple[List[Note], float]:
        """Decode the optimal fingering path and write it back onto the notes.

        Notes with no playable candidate are dropped (treated as rests).  The
        surviving notes get ``.string`` and ``.fret`` set.  Returns the notes and
        the total path cost J(path).
        """
        playable = [n for n in notes if self.candidates(n.midi)]
        if not playable:
            return [], 0.0
        Cs = [self.candidates(n.midi) for n in playable]

        # forward pass
        D = [self.emission(Cs[0])]
        B: List[Optional[np.ndarray]] = [None]
        for t in range(1, len(Cs)):
            M = self.transition_matrix(Cs[t - 1], Cs[t])      # (P, C)
            P = D[t - 1][:, None] + M                          # broadcast add
            D.append(self.emission(Cs[t]) + P.min(axis=0))     # reduce over prev
            B.append(P.argmin(axis=0))

        # back-track
        j = int(np.argmin(D[-1]))
        total_cost = float(D[-1][j])
        path = [j]
        for t in range(len(Cs) - 1, 0, -1):
            j = int(B[t][j])
            path.append(j)
        path.reverse()

        for n, t_idx, pos_idx in zip(playable, range(len(Cs)), path):
            n.string, n.fret = Cs[t_idx][pos_idx]
        return playable, total_cost


# ===========================================================================
# 7.  ASCII TAB RENDERER
# ===========================================================================
def render_tab(notes: List[Note], instrument: Instrument, cells_per_measure: int,
               cell_width: int = 2) -> str:
    """Lay the mapped notes onto a string×time grid and format as ASCII tab.

    Highest-pitched string is printed on top (conventional orientation).  Each
    grid cell is ``cell_width`` characters wide; measures are separated by ``|``.
    """
    if not notes:
        return "(no notes detected)"
    n_strings = instrument.n_strings
    total_cells = max(n.cell for n in notes) + 1
    # pad up to a whole number of measures
    total_cells = ((total_cells + cells_per_measure - 1) // cells_per_measure) * cells_per_measure

    dash = "-" * cell_width
    grid = [[dash] * total_cells for _ in range(n_strings)]
    for n in notes:
        token = str(n.fret).ljust(cell_width, "-")[:cell_width] if n.fret < 10 \
            else str(n.fret)[:cell_width]
        grid[n.string][n.cell] = token

    labels = [midi_to_name(m, with_octave=False) for m in instrument.open_strings]
    lbl_w = max(len(l) for l in labels)

    lines = []
    for s in range(n_strings - 1, -1, -1):           # high string on top
        row = grid[s]
        chunks = []
        for start in range(0, total_cells, cells_per_measure):
            chunks.append("".join(row[start:start + cells_per_measure]))
        lines.append(f"{labels[s].rjust(lbl_w)}|" + "|".join(chunks) + "|")
    return "\n".join(lines)


# ===========================================================================
# 8.  TOP-LEVEL ORCHESTRATION
# ===========================================================================
def transcribe(path: Optional[str], instrument_key: str, bpm: float,
               tracker: str = "pyin", subdivisions: int = 4,
               y: Optional[np.ndarray] = None, sr: int = 22050,
               cfg: CostConfig = CostConfig(), verbose: bool = True) -> str:
    """Run the whole pipeline and return the ASCII tab string."""
    inst = INSTRUMENTS[instrument_key]
    # constrain the pitch search to the instrument's real range (+ a margin)
    fmin = midi_to_hz(min(inst.open_strings) - 2)
    fmax = midi_to_hz(max(inst.open_strings) + inst.n_frets + 2)

    fe = AudioFrontEnd(sr=sr, fmin=fmin, fmax=fmax, tracker=tracker)
    res = fe.analyze(path=path, y=y)
    notes = segment_notes(res)
    notes, cells_per_measure = quantize(notes, bpm=bpm, subdivisions=subdivisions)
    mapper = FretboardMapper(inst, cfg)
    mapped, total_cost = mapper.map_notes(notes)
    tab = render_tab(mapped, inst, cells_per_measure)

    if verbose:
        grid = {4: "16th", 2: "8th", 1: "quarter"}.get(subdivisions, f"1/{subdivisions*4}")
        print(f"# Instrument : {inst.name}")
        print(f"# Pitch track: {tracker}{' (librosa)' if tracker=='pyin' and _HAVE_LIBROSA else ''}")
        print(f"# Tempo      : {bpm:.0f} BPM, {grid}-note grid")
        print(f"# Notes      : {len(mapped)} mapped "
              f"({' '.join(midi_to_name(n.midi) for n in mapped[:16])}"
              f"{' ...' if len(mapped) > 16 else ''})")
        print(f"# Path cost  : {total_cost:.2f}\n")
    return tab


# ===========================================================================
# 9.  SYNTHESIS + SELF-TEST  (verifiable without a real stem)
# ===========================================================================
def synthesize(midi_seq: Sequence[int], bpm: float, sr: int = 22050,
               note_beats: float = 0.5, harmonics=(1.0, 0.5, 0.25, 0.12)) -> np.ndarray:
    """Render a monophonic melody to audio with plucked-string-ish envelopes.

    Each note is a short harmonic stack with a fast attack and exponential decay
    (so onset detection has something to find) followed by a small silence.
    """
    rng = np.random.default_rng(0)
    beat = 60.0 / bpm
    dur = note_beats * beat
    n = int(dur * sr)
    t = np.arange(n) / sr
    env = np.exp(-4.0 * t / dur) * (1 - np.exp(-t / 0.005))   # pluck envelope
    gap = np.zeros(int(0.04 * sr))
    chunks = []
    for m in midi_seq:
        f = midi_to_hz(m)
        wave = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in enumerate(harmonics, 1))
        wave = wave * env + 0.002 * rng.standard_normal(n)    # touch of noise
        chunks.append(wave.astype(np.float32))
        chunks.append(gap.astype(np.float32))
    y = np.concatenate(chunks)
    return (y / (np.max(np.abs(y)) + 1e-9)).astype(np.float32)


def _greedy_map(mapper: "FretboardMapper", notes: List[Note]) -> List[Tuple[int, int]]:
    """Baseline: pick each note's lowest *emission* position independently.

    This ignores hand movement entirely — the naive thing a per-note lookup does.
    Used only to contrast against the Viterbi path in the self-test.
    """
    out = []
    for n in notes:
        cands = mapper.candidates(n.midi)
        e = mapper.emission(cands)
        out.append(cands[int(np.argmin(e))])
    return out


def self_test() -> None:
    """Synthesize known licks and transcribe them, for both instruments."""
    print("=" * 64)
    print("SELF-TEST 1 — Guitar: low A-minor-pentatonic phrase")
    print("=" * 64)
    # A2 C3 D3 E3 G3 A3 G3 E3 D3 C3  -> 45 48 50 52 55 57 55 52 50 48
    # (this phrase genuinely lives in OPEN position — open strings are cheapest,
    #  so the playability cost correctly favours frets 0-3 near the nut.)
    lick = [45, 48, 50, 52, 55, 57, 55, 52, 50, 48]
    y = synthesize(lick, bpm=120, note_beats=0.5)
    print(transcribe(None, "guitar", bpm=120, y=y, subdivisions=2))
    print()

    print("=" * 64)
    print("SELF-TEST 2 — Bass: walking line")
    print("=" * 64)
    # E1 G1 A1 B1 C2 B1 A1 G1 -> 28 31 33 35 36 35 33 31
    bass = [28, 31, 33, 35, 36, 35, 33, 31]
    y = synthesize(bass, bpm=100, note_beats=0.5)
    print(transcribe(None, "bass", bpm=100, y=y, subdivisions=2))
    print()

    # --- a decisive unit-check of the cost logic (no audio) ---
    print("=" * 64)
    print("UNIT CHECK — Viterbi keeps the hand in position (vs greedy)")
    print("=" * 64)
    inst = INSTRUMENTS["guitar"]
    mapper = FretboardMapper(inst)
    # Context puts the hand high (A4 lives best at high-E fret 5). The next note
    # E4 *could* be the cheap open high-E (fret 0) — greedy will grab it and leap
    # 5 frets to the nut. A real player stays put and fingers E4 on the B string
    # (fret 5). The transition cost should make Viterbi do the same.
    #   A4=69, E4=64, F#4=66, G4=67  (a little phrase around the 5th-fret box)
    seq = [Note(69, 0, 0.5, cell=0), Note(64, 0.5, 0.5, cell=2),
           Note(66, 1.0, 0.5, cell=4), Note(67, 1.5, 0.5, cell=6)]
    greedy = _greedy_map(mapper, seq)
    mapped, cost = mapper.map_notes(seq)
    g_frets = [f for _, f in greedy]
    v_frets = [n.fret for n in mapped]
    show = lambda pairs: "  ".join(f"{midi_to_name(m)}->(s{s},f{f})"
                                   for m, (s, f) in zip([n.midi for n in seq], pairs))
    print("  greedy : ", show(greedy), f"   fret span = {max(g_frets)-min(g_frets)}")
    print("  viterbi: ", show([(n.string, n.fret) for n in mapped]),
          f"   fret span = {max(v_frets)-min(v_frets)}   cost={cost:.2f}")
    assert max(v_frets) - min(v_frets) <= 3, "Viterbi should stay inside the box"
    assert (max(g_frets) - min(g_frets)) > (max(v_frets) - min(v_frets)), \
        "Viterbi path should be more compact than the greedy one"
    print("  PASS — Viterbi avoided the greedy leap to the nut and stayed in the box.\n")
    print("All self-tests completed.")


# ===========================================================================
# CLI
# ===========================================================================
def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Transcribe an isolated bass/guitar stem to ASCII tab.")
    p.add_argument("input", nargs="?", help="path to an isolated .wav stem")
    p.add_argument("--instrument", choices=list(INSTRUMENTS), default="guitar")
    p.add_argument("--bpm", type=float, default=120.0, help="tempo (BPM)")
    p.add_argument("--tracker", choices=["pyin", "crepe", "yin"], default="pyin")
    p.add_argument("--grid", choices=["8", "16"], default="16",
                   help="rhythmic grid: 8th or 16th notes")
    p.add_argument("--self-test", action="store_true", help="run built-in demo")
    args = p.parse_args(argv)

    if args.self_test:
        self_test()
        return 0
    if not args.input:
        p.error("provide an input .wav stem, or use --self-test")

    subdivisions = 4 if args.grid == "16" else 2
    tab = transcribe(args.input, args.instrument, bpm=args.bpm,
                     tracker=args.tracker, subdivisions=subdivisions)
    print(tab)
    return 0


if __name__ == "__main__":
    sys.exit(main())
