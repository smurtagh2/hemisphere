/**
 * BarChart Component
 *
 * A simple reusable SVG vertical bar chart.
 */

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  color?: string;
  maxValue?: number;
  height?: number;
}

export function BarChart({
  data,
  color = 'var(--accent-primary)',
  maxValue,
  height = 80,
}: BarChartProps) {
  if (data.length === 0) return null;

  const resolvedMax = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barAreaHeight = height - 20; // reserve 20px at bottom for labels
  const barWidth = 100 / data.length;
  const gap = 0.15; // 15% of bar width as gap on each side

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-label="Bar chart"
      role="img"
      style={{ display: 'block' }}
    >
      {data.map((item, index) => {
        const barHeightPx = resolvedMax > 0 ? (item.value / resolvedMax) * barAreaHeight : 0;
        const x = index * barWidth + barWidth * gap;
        const w = barWidth * (1 - gap * 2);
        const y = barAreaHeight - barHeightPx;

        return (
          <g key={index}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={w}
              height={barHeightPx}
              fill={color}
              opacity="0.85"
              rx="1"
            />

            {/* Label */}
            <text
              x={x + w / 2}
              y={height - 4}
              textAnchor="middle"
              fontSize="4.5"
              fill="var(--text-secondary, #8899aa)"
              fontFamily="var(--font-analysis, sans-serif)"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
