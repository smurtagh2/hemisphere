/**
 * Sparkline Component
 *
 * A simple reusable SVG sparkline that draws a smooth polyline
 * connecting data points, with a subtle area fill beneath.
 */

interface SparklineProps {
  data: number[];
  /** SVG width in px. Defaults to 200. Pass a large value and let the parent constrain it. */
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}

export function Sparkline({
  data,
  width = 200,
  height = 48,
  color = 'var(--accent-primary)',
  label,
}: SparklineProps) {
  if (data.length === 0) return null;

  const padding = 4;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * innerWidth;
    const y = padding + (1 - (value - min) / range) * innerHeight;
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Area fill path: line from first point, trace all points, down to baseline, back to start
  const areaPath = [
    `M ${points[0].x},${height - padding}`,
    ...points.map((p) => `L ${p.x},${p.y}`),
    `L ${points[points.length - 1].x},${height - padding}`,
    'Z',
  ].join(' ');

  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label={label}
      role={label ? 'img' : 'presentation'}
      style={{ display: 'block', overflow: 'hidden' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
        stroke="none"
      />

      {/* Line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}
