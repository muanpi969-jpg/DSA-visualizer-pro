import { describe, it, expect } from "vitest";
import { getAllAlgorithms } from "@/lib/algorithms/registry";
import type { CodeLanguage } from "@/lib/algorithms/types";

/**
 * Guards the invariant that the code panel must never drift from the generator,
 * extended to every language tab: each line the generator can emit must map to
 * valid, non-blank line(s) in every non-primary language snippet.
 */
describe("per-language line maps", () => {
  for (const def of getAllAlgorithms()) {
    const languages = (Object.keys(def.code) as CodeLanguage[]).filter(
      (lang) => lang !== def.primaryLanguage,
    );
    if (languages.length === 0) continue;

    // Collect every active line the generator emits across default + presets.
    const usedLines = new Set<number>();
    const inputs = [def.defaultInput, ...def.presets.map((p) => p.input)];
    for (const input of inputs) {
      for (const step of def.generateSteps(input)) {
        for (const line of step.code.activeLines) usedLines.add(line);
      }
    }

    describe(def.slug, () => {
      it("emits steps in the primary language only", () => {
        for (const input of inputs) {
          for (const step of def.generateSteps(input)) {
            expect(step.code.language).toBe(def.primaryLanguage);
          }
        }
      });

      for (const lang of languages) {
        it(`maps every generator line to valid ${lang} lines`, () => {
          const map = def.lineMaps?.[lang];
          expect(map, `${def.slug}: missing lineMap for ${lang}`).toBeDefined();

          const snippetLines = def.code[lang]!.split("\n");
          for (const line of usedLines) {
            const mapped = map![line];
            expect(
              mapped,
              `${def.slug} ${lang}: generator line ${line} has no mapping`,
            ).toBeDefined();

            const targets = Array.isArray(mapped) ? mapped : [mapped!];
            expect(targets.length).toBeGreaterThan(0);
            for (const t of targets) {
              expect(Number.isInteger(t)).toBe(true);
              expect(t, `${def.slug} ${lang}: line ${t} < 1`).toBeGreaterThanOrEqual(1);
              expect(
                t,
                `${def.slug} ${lang}: line ${t} beyond snippet (${snippetLines.length} lines)`,
              ).toBeLessThanOrEqual(snippetLines.length);
              expect(
                (snippetLines[t - 1] ?? "").trim().length,
                `${def.slug} ${lang}: mapped line ${t} is blank`,
              ).toBeGreaterThan(0);
            }
          }
        });
      }
    });
  }
});
