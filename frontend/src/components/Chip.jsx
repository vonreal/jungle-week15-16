export default function Chip({ type, children }) {
  return <span className={`chip chip-${type}`}>{children}</span>;
}

