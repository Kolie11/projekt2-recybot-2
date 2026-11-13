// Einfache SVG-Zeichnungen von Verpackungen/Müll, passend in eine Box (x, y, w, h).

export function Litter({ type, x, y, w, h, color }) {
  switch (type) {
    case "pet": {
      const c = color || "#9ED3F0";
      return (
        <g>
          <rect x={x + w * 0.3} y={y} width={w * 0.4} height={h * 0.12} rx={3} fill="#2E7DB5" />
          <rect x={x} y={y + h * 0.1} width={w} height={h * 0.9} rx={Math.min(w, h) * 0.25} fill={c} opacity="0.92" />
          <rect x={x} y={y + h * 0.42} width={w} height={h * 0.2} fill="#FFFFFF" opacity="0.55" />
        </g>
      );
    }
    case "petCrushed":
      return (
        <g>
          <path d={`M${x} ${y + h * 0.3} L${x + w * 0.3} ${y} L${x + w * 0.55} ${y + h * 0.25} L${x + w * 0.8} ${y + h * 0.05} L${x + w} ${y + h * 0.35} L${x + w * 0.9} ${y + h} L${x + w * 0.1} ${y + h} Z`} fill={color || "#9ED3F0"} opacity="0.9" />
          <rect x={x + w * 0.88} y={y + h * 0.25} width={w * 0.12} height={h * 0.4} rx={2} fill="#2E7DB5" />
        </g>
      );
    case "glass":
      return (
        <g>
          <rect x={x + w * 0.32} y={y} width={w * 0.36} height={h * 0.32} rx={4} fill={color || "#3E6B35"} />
          <rect x={x} y={y + h * 0.28} width={w} height={h * 0.72} rx={w * 0.2} fill={color || "#4E7F42"} />
          <rect x={x + w * 0.12} y={y + h * 0.45} width={w * 0.15} height={h * 0.4} rx={3} fill="#FFFFFF" opacity="0.35" />
        </g>
      );
    case "can":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={w * 0.12} fill="#B8C2C8" />
          <rect x={x} y={y + h * 0.18} width={w} height={h * 0.32} fill={color || "#D7372F"} />
          <ellipse cx={x + w / 2} cy={y + 3} rx={w / 2} ry={4} fill="#8E999F" />
        </g>
      );
    case "canCrushed":
      return (
        <g>
          <path d={`M${x} ${y + h * 0.2} L${x + w} ${y} L${x + w * 0.95} ${y + h} L${x + w * 0.05} ${y + h * 0.85} Z`} fill="#B8C2C8" />
          <path d={`M${x + w * 0.2} ${y + h * 0.18} L${x + w * 0.75} ${y + h * 0.08} L${x + w * 0.72} ${y + h * 0.6} L${x + w * 0.22} ${y + h * 0.65} Z`} fill={color || "#D7372F"} />
        </g>
      );
    case "carton": // Getränkekarton (Verbund)
      return (
        <g>
          <path d={`M${x} ${y + h * 0.2} L${x + w / 2} ${y} L${x + w} ${y + h * 0.2} Z`} fill="#E8E2D0" />
          <rect x={x} y={y + h * 0.2} width={w} height={h * 0.8} fill="#F2EEE3" />
          <rect x={x} y={y + h * 0.45} width={w} height={h * 0.25} fill={color || "#2E8B57"} />
          <rect x={x + w * 0.6} y={y + h * 0.05} width={w * 0.18} height={h * 0.12} rx={2} fill="#1E6B4E" />
        </g>
      );
    case "box": // Pappkarton (Papier)
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={4} fill="#C9A26B" />
          <rect x={x} y={y} width={w} height={h * 0.2} fill="#B18852" />
          <rect x={x + w * 0.42} y={y} width={w * 0.16} height={h} fill="#D9B98A" />
        </g>
      );
    case "cup": // Joghurtbecher
      return (
        <g>
          <path d={`M${x} ${y} H${x + w} L${x + w * 0.82} ${y + h} H${x + w * 0.18} Z`} fill="#FFFFFF" stroke="#C9D0CA" strokeWidth="2" />
          <rect x={x} y={y} width={w} height={h * 0.12} fill={color || "#E9B949"} />
        </g>
      );
    case "paper":
      return <path d={`M${x} ${y + h * 0.2} L${x + w * 0.7} ${y} L${x + w} ${y + h * 0.6} L${x + w * 0.3} ${y + h} Z`} fill="#F4F4F4" stroke="#C9D0CA" strokeWidth="1.5" />;
    case "butt":
      return (
        <g>
          <rect x={x} y={y + h * 0.3} width={w * 0.7} height={h * 0.4} rx={2} fill="#F4F4F4" />
          <rect x={x + w * 0.7} y={y + h * 0.3} width={w * 0.3} height={h * 0.4} rx={2} fill="#D98E3B" />
        </g>
      );
    case "bag":
      return <path d={`M${x} ${y + h * 0.3} Q${x + w * 0.5} ${y - h * 0.2} ${x + w} ${y + h * 0.3} L${x + w * 0.85} ${y + h} L${x + w * 0.15} ${y + h} Z`} fill={color || "#E8EEF2"} opacity="0.9" stroke="#B7C2C8" />;
    default:
      return <rect x={x} y={y} width={w} height={h} fill="#999" />;
  }
}
