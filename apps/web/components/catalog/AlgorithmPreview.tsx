import type { AlgorithmCategory } from "@/lib/algorithms/types";

/** Illustrations describe the data shape; the real trace runs in the visualizer. */
export function AlgorithmPreview({
  category,
  variant = 0,
}: {
  category: AlgorithmCategory;
  variant?: number;
}) {
  if (category === "graph" || category === "tree") {
    const tree = category === "tree";
    const nodes = tree
      ? [
          [100, 16],
          [57, 43],
          [143, 43],
          [32, 70],
          [78, 70],
          [123, 70],
          [169, 70],
        ]
      : [
          [35, 46],
          [79, 17],
          [129, 22],
          [163, 53],
          [104, 69],
          [65, 65],
        ];
    const edges = tree
      ? [
          [0, 1],
          [0, 2],
          [1, 3],
          [1, 4],
          [2, 5],
          [2, 6],
        ]
      : [
          [0, 1],
          [0, 5],
          [1, 2],
          [1, 4],
          [2, 3],
          [3, 4],
          [4, 5],
        ];
    return (
      <svg viewBox="0 0 200 86" fill="none" aria-hidden="true">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            stroke="currentColor"
            strokeWidth="1.6"
            opacity={i < 3 ? 0.45 : 0.15}
          />
        ))}
        {nodes.map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="9"
              fill={
                i === variant % nodes.length
                  ? "hsl(var(--primary))"
                  : "hsl(var(--card))"
              }
              stroke="currentColor"
              strokeOpacity=".3"
            />
            <text
              x={x}
              y={y + 3}
              textAnchor="middle"
              fontSize="8"
              fill={
                i === variant % nodes.length
                  ? "hsl(var(--primary-foreground))"
                  : "currentColor"
              }
            >
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        ))}
      </svg>
    );
  }
  if (category === "dynamic-programming")
    return (
      <svg viewBox="0 0 200 86" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <g key={i}>
            <rect
              x={34 + (i % 6) * 22}
              y={5 + Math.floor(i / 6) * 19}
              width="19"
              height="16"
              rx="3"
              fill="currentColor"
              opacity={i === 15 ? 0.65 : i < 16 ? 0.16 : 0.05}
            />
            <text
              x={43.5 + (i % 6) * 22}
              y={16 + Math.floor(i / 6) * 19}
              textAnchor="middle"
              fontSize="7"
              fill={
                i === 15 ? "hsl(var(--primary-foreground))" : "currentColor"
              }
              opacity={i < 16 ? 0.8 : 0.3}
            >
              {i < 16 ? Math.floor(i / 6) + (i % 6) : "·"}
            </text>
          </g>
        ))}
      </svg>
    );
  if (category === "data-structures")
    return (
      <svg viewBox="0 0 200 86" fill="none" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect
              x={13 + i * 46}
              y="26"
              width="34"
              height="34"
              rx="8"
              fill="currentColor"
              fillOpacity={i === 1 ? 0.2 : 0.06}
              stroke="currentColor"
              strokeOpacity=".25"
            />
            <text
              x={30 + i * 46}
              y="47"
              fontSize="11"
              textAnchor="middle"
              fill="currentColor"
            >
              {i + 1}
            </text>
            {i < 3 && (
              <path
                d={`M ${49 + i * 46} 43 h 9 m -3 -3 3 3 -3 3`}
                stroke="currentColor"
                strokeOpacity=".45"
              />
            )}
          </g>
        ))}
      </svg>
    );
  if (category === "search")
    return (
      <svg viewBox="0 0 200 86" aria-hidden="true">
        {[2, 5, 8, 12, 16, 21, 27].map((v, i) => (
          <g key={i}>
            <rect
              x={12 + i * 25}
              y="27"
              width="22"
              height="29"
              rx="5"
              fill="currentColor"
              opacity={i === 3 ? 0.8 : i < 3 ? 0.06 : 0.15}
            />
            <text
              x={23 + i * 25}
              y="45"
              fontSize="9"
              textAnchor="middle"
              fill={i === 3 ? "hsl(var(--primary-foreground))" : "currentColor"}
              opacity={i < 3 ? 0.4 : 1}
            >
              {v}
            </text>
            {i === 3 && (
              <path
                d="m 94 65 4 -4 4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            )}
          </g>
        ))}
      </svg>
    );
  const values =
    variant % 2 === 0
      ? [28, 46, 35, 59, 40, 65, 53, 72]
      : [24, 36, 53, 40, 68, 49, 61, 74];
  return (
    <svg viewBox="0 0 200 86" aria-hidden="true">
      {values.map((h, i) => (
        <rect
          key={i}
          x={17 + i * 21}
          y={80 - h}
          width="15"
          height={h}
          rx="3"
          fill={i === 3 || i === 4 ? "hsl(var(--viz-compare))" : "currentColor"}
          opacity={i === 3 || i === 4 ? 0.7 : 0.2 + i * 0.055}
        />
      ))}
    </svg>
  );
}
