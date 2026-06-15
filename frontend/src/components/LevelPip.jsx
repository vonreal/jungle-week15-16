const STYLE = {
  1: { bg: "#F3F4F6", border: "#9CA3AF", color: "#374151" },
  2: { bg: "var(--blue-l)", border: "var(--blue)", color: "var(--blue)" },
  3: { bg: "var(--purple-l)", border: "var(--purple)", color: "var(--purple)" },
  4: { bg: "var(--amber-l)", border: "var(--amber)", color: "var(--amber)" },
};

export default function LevelPip({ lv, active, label, onClick, ariaLabel }) {
  const activeStyle = STYLE[lv];
  const style = active
    ? { background: activeStyle.bg, borderColor: activeStyle.border, color: activeStyle.color }
    : { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text4)" };
  return (
    <button
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      title={label}
      className="level-pip"
      style={style}
      type="button"
    >
      {lv}
    </button>
  );
}
