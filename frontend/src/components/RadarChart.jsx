export default function RadarChart({ data, size = 260 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const pad = Math.max(34, size * 0.16);
  const n = data.length;
  const angle = (i) => (i * 2 * Math.PI) / n - Math.PI / 2;
  const point = (i, scale) => [
    cx + r * scale * Math.cos(angle(i)),
    cy + r * scale * Math.sin(angle(i)),
  ];
  const poly = (scale) => data.map((_, i) => point(i, scale).join(",")).join(" ");
  const dataPoly = data.map((d, i) => point(i, d.v / 100).join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`} aria-label="스탯 레이더 차트">
      {[0.33, 0.66, 1].map((scale) => (
        <polygon key={scale} points={poly(scale)} fill="none" stroke="#E4E7EC" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E4E7EC" strokeWidth="1" />;
      })}
      <polygon
        points={dataPoly}
        fill="rgba(59,111,239,0.09)"
        stroke="#3B6FEF"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const [x, y] = point(i, d.v / 100);
        return <circle key={d.label} cx={x} cy={y} r="4.5" fill="#3B6FEF" stroke="#fff" strokeWidth="2" />;
      })}
      {data.map((d, i) => {
        const [x, y] = point(i, 1.2);
        const anchor = x < cx - 4 ? "end" : x > cx + 4 ? "start" : "middle";
        return (
          <text
            key={d.label}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fill="#9CA3AF"
            fontSize="11.5"
            fontFamily="Pretendard, sans-serif"
            fontWeight="600"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
