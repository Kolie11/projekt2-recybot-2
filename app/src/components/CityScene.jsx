// Illustrierte Kreislaufstadt: jedes Gebäude steht für ein Modul und verändert sich mit dem Ergebnis.
// good → begrüntes Dach, Solarzellen, Licht · bad → Rauch, graue Fenster · open → nur Umriss.
import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "../lib/motion.js";
const GROUND = 250;
const COL = {
  good: { wall: "#DDF0E4", line: "#1A6B48", win: "#FFF1BF" },
  mid: { wall: "#EDEBE5", line: "#7D847B", win: "#F5EBCF" },
  bad: { wall: "#F6DCCB", line: "#B5481A", win: "#A9A9A0" },
  open: { wall: "rgba(255,255,255,.55)", line: "#B8B0A0", win: "none" }
};

const B = [
  { key: "label", x: 34, w: 92, h: 118, roof: "flat" },
  { key: "line", x: 146, w: 176, h: 88, roof: "saw" },
  { key: "tycoon", x: 342, w: 82, h: 138, roof: "slant" },
  { key: "policy", x: 446, w: 128, h: 146, roof: "gable" },
  { key: "repair", x: 594, w: 92, h: 78, roof: "awning" },
  { key: "green", x: 704, w: 100, h: 108, roof: "flat" },
  { key: "sprint", x: 822, w: 62, h: 172, roof: "mast" }
];

function Windows({ x, y, w, h, c, cols, rows }) {
  if (c.win === "none") return null;
  const out = [], gx = w / cols, gy = h / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    out.push(<rect key={i + "-" + j} x={x + i * gx + gx * 0.22} y={y + j * gy + gy * 0.25} width={gx * 0.56} height={gy * 0.5} rx="2" fill={c.win} stroke={c.line} strokeOpacity=".35" />);
  }
  return out;
}

function Smoke({ x, y }) {
  return (
    <g className="smoke" fill="#9C9A92" opacity=".55">
      <circle cx={x} cy={y - 8} r="7" /><circle cx={x + 8} cy={y - 20} r="9" /><circle cx={x + 2} cy={y - 34} r="11" />
    </g>
  );
}

function Building({ b, status, title, href }) {
  const c = COL[status], top = GROUND - b.h, dash = status === "open" ? "6 5" : undefined;
  const sw = 2.4, rest = { fill: c.wall, stroke: c.line, strokeWidth: sw, strokeDasharray: dash, strokeLinejoin: "round" };
  let roof = null, chimney = null;
  if (b.roof === "saw") {
    const n = 4, step = b.w / n;
    roof = <path d={`M${b.x} ${top} ` + Array.from({ length: n }, (_, i) => `L${b.x + i * step} ${top - 22} L${b.x + (i + 1) * step} ${top}`).join(" ")} {...rest} />;
    chimney = <rect x={b.x + b.w - 26} y={top - 52} width="14" height="52" {...rest} />;
  } else if (b.roof === "slant") roof = <path d={`M${b.x} ${top} L${b.x + b.w} ${top - 24} L${b.x + b.w} ${top}z`} {...rest} />;
  else if (b.roof === "gable") roof = <path d={`M${b.x - 8} ${top} L${b.x + b.w / 2} ${top - 34} L${b.x + b.w + 8} ${top}z`} {...rest} />;
  else if (b.roof === "awning") roof = <path d={`M${b.x - 6} ${top + 14} L${b.x + b.w + 6} ${top + 14} L${b.x + b.w - 2} ${top} L${b.x + 2} ${top}z`} fill={status === "open" ? "none" : status === "bad" ? "#C9A28E" : "#E9B949"} stroke={c.line} strokeWidth={sw} strokeDasharray={dash} />;
  else if (b.roof === "mast") roof = <g stroke={c.line} strokeWidth={sw} strokeDasharray={dash} fill="none">
    <path d={`M${b.x + b.w / 2} ${top} V${top - 30}`} />
    {status === "good" && <><path d={`M${b.x + b.w / 2 - 12} ${top - 38} a16 16 0 0 1 24 0`} /><path d={`M${b.x + b.w / 2 - 20} ${top - 46} a26 26 0 0 1 40 0`} /></>}
  </g>;

  const roofTop = top - (b.roof === "saw" ? 22 : b.roof === "gable" ? 34 : b.roof === "slant" ? 24 : 0);
  return (
    <a href={href} className="cs-b">
      <title>{title}</title>
      {chimney}
      <rect x={b.x} y={top} width={b.w} height={b.h} rx="3" {...rest} />
      {roof}
      {b.key === "policy" && status !== "open" && <>
        {[0, 1, 2, 3].map(i => <rect key={i} x={b.x + 14 + i * 28} y={top + 56} width="10" height={b.h - 62} fill="#fff" stroke={c.line} strokeOpacity=".5" />)}
        <circle cx={b.x + b.w / 2} cy={top - 12} r="8" fill="#fff" stroke={c.line} strokeWidth="2" />
      </>}
      {b.key !== "policy" && <Windows x={b.x + 6} y={top + 8} w={b.w - 12} h={b.h - 30} c={c} cols={Math.max(2, Math.round(b.w / 30))} rows={Math.max(1, Math.round(b.h / 38))} />}
      {b.key === "green" && status !== "open" && [0, 1, 2].map(i => <circle key={i} cx={b.x + 18 + i * 10} cy={GROUND - 12} r="2.4" fill={status === "bad" ? "#E0592A" : "#2FBF71"} />)}
      {status === "good" && b.roof !== "mast" && b.roof !== "awning" && (
        <g>
          <path d={`M${b.x + 8} ${roofTop - 1} h${Math.min(30, b.w * 0.35)} l-6 -10 h${-Math.min(30, b.w * 0.35) + 12}z`} fill="#3D6E9C" stroke="#264B6B" strokeWidth="1.2" />
          <circle cx={b.x + b.w - 14} cy={roofTop - 9} r="9" fill="#5DB37E" /><circle cx={b.x + b.w - 24} cy={roofTop - 5} r="6" fill="#4A9E6A" />
        </g>
      )}
      {status === "bad" && <Smoke x={b.roof === "saw" ? b.x + b.w - 19 : b.x + b.w / 2} y={b.roof === "saw" ? top - 52 : roofTop} />}
    </a>
  );
}

export default function CityScene({ city, titles, label }) {
  const ref = useRef(null);
  // Die Stadt baut sich auf, wenn sie ins Bild kommt: Gebäude wachsen von unten nach oben.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.from(".cs-b", {
        y: 40, autoAlpha: 0, duration: 0.5, stagger: 0.07, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true }
      });
    });
  }, { scope: ref });
  const sky = city.co2 <= -8 ? ["#BFE2F2", "#EEF6F2"] : city.co2 >= 6 ? ["#D6CFBF", "#EFEAE0"] : ["#D3E7EE", "#F1F2EC"];
  const routes = city.tiles.routes.status;
  return (
    <svg ref={ref} className="city-scene" viewBox="0 0 920 300" role="img" aria-label={label}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>
      </defs>
      <rect width="920" height="300" fill="url(#sky)" rx="14" />
      <circle cx="80" cy="56" r="26" fill={city.co2 >= 6 ? "#E8D9A8" : "#F7D46A"} opacity={city.co2 >= 6 ? 0.6 : 1} />
      <g fill="#fff" opacity=".8"><ellipse cx="300" cy="50" rx="44" ry="13" /><ellipse cx="330" cy="42" rx="30" ry="12" /><ellipse cx="660" cy="62" rx="38" ry="11" /></g>
      {city.tiles.green.status === "good" && (
        <g className="turbine" stroke="#7D847B" strokeWidth="2.5" strokeLinecap="round">
          <path d="M600 250 V150" /><g className="blades" style={{ transformOrigin: "600px 150px" }}><path d="M600 150 V118 M600 150 L628 166 M600 150 L572 166" /></g>
        </g>
      )}
      {B.map(b => <Building key={b.key} b={b} status={city.tiles[b.key].status} title={titles[b.key]} href={"#" + b.key} />)}
      <rect x="0" y={GROUND} width="920" height="50" fill="#CFC8B8" />
      <path d={`M0 ${GROUND + 25} H920`} stroke="#fff" strokeWidth="3" strokeDasharray="18 14" />
      {[18, 136, 436, 690, 896].map(x => <g key={x}><rect x={x - 1.5} y={GROUND - 16} width="3" height="16" fill="#7A6A52" /><circle cx={x} cy={GROUND - 22} r="10" fill="#6FBF8A" /></g>)}
      <a href="#routes" className="cs-b">
        <title>{titles.routes}</title>
        <g className={"truck" + (routes === "open" ? " idle" : "")}>
          <rect x="0" y={GROUND + 6} width="46" height="22" rx="3" fill={routes === "good" ? "#1A6B48" : routes === "bad" ? "#8C6A4F" : routes === "open" ? "#fff" : "#7D847B"} stroke="#0F2419" strokeWidth="1.5" strokeDasharray={routes === "open" ? "4 3" : undefined} />
          <rect x="46" y={GROUND + 12} width="18" height="16" rx="3" fill="#E8E4D8" stroke="#0F2419" strokeWidth="1.5" />
          <circle cx="12" cy={GROUND + 30} r="5" fill="#0F2419" /><circle cx="52" cy={GROUND + 30} r="5" fill="#0F2419" />
          {routes === "bad" && <g fill="#9C9A92" opacity=".6"><circle cx="-6" cy={GROUND + 22} r="5" /><circle cx="-16" cy={GROUND + 16} r="7" /></g>}
        </g>
      </a>
    </svg>
  );
}
