// Linien-Icons je Modul (24 × 24, currentColor).
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

const paths = {
  label: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M10 8h4v2.2l1.2 1.6V17a1 1 0 0 1-1 1H9.8a1 1 0 0 1-1-1v-5.2L10 10.2z" /></>,
  line: <><rect x="3" y="15" width="18" height="4" rx="2" /><circle cx="7" cy="17" r=".6" /><circle cx="12" cy="17" r=".6" /><circle cx="17" cy="17" r=".6" /><path d="M9 4h6l-1 3h-4z" /><path d="M12 7v2M8.5 12.5 10 11M15.5 12.5 14 11" /></>,
  tycoon: <><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>,
  repair: <><path d="M14.5 5.5a4 4 0 0 0-5 5L4 16v4h4l5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" /></>,
  routes: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></>,
  policy: <><path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M3 10l9-6 9 6z" /></>,
  sprint: <><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></>,
  green: <><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path d="M5 19c3-4 6-6 9-7.5" /></>,
  capstone: <><path d="M3 21h18M5 21V11l4-3v13M9 21V6l6-3v18M15 21v-8h4v8" /></>,
  test: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  report: <><path d="M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="m9.5 14.5-1.5 6.5 4-2 4 2-1.5-6.5" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />
};

export function Icon({ name, size = 24, ...rest }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...P} {...rest}>{paths[name]}</svg>;
}

/** Das RecyBot-Logo: Roboterkopf in einem Kreislauf-Pfeil. */
export function Logo({ size = 34, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" {...rest}>
      <circle cx="20" cy="20" r="20" fill="#8BD9AE" />
      <path d="M31 14.5A12 12 0 0 0 9.4 13" fill="none" stroke="#0F2419" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 25.5A12 12 0 0 0 30.6 27" fill="none" stroke="#0F2419" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M31.8 9.8 31 14.5l-4.6-.9M8.2 30.2l.8-4.7 4.6.9" fill="none" stroke="#0F2419" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="13.5" y="15" width="13" height="10.5" rx="3" fill="#0F2419" />
      <circle cx="17.3" cy="20" r="1.5" fill="#8BD9AE" /><circle cx="22.7" cy="20" r="1.5" fill="#8BD9AE" />
    </svg>
  );
}
