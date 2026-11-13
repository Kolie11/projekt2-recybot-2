import { createContext, useContext, useEffect, useState } from "react";

// Module melden ihren Spielstand hierher; der schwebende Assistent liest ihn.
// Zwei getrennte Kontexte: Module schreiben nur und werden dadurch nicht neu gerendert.
const StateCtx = createContext(null);
const SetCtx = createContext(() => {});

export function TutorProvider({ children }) {
  const [tutor, setTutor] = useState(null);
  return <SetCtx.Provider value={setTutor}><StateCtx.Provider value={tutor}>{children}</StateCtx.Provider></SetCtx.Provider>;
}

/** Im Modul aufrufen: useTutor("line", { …Spielstand… }) */
export function useTutor(module, ctx) {
  const set = useContext(SetCtx);
  const json = JSON.stringify(ctx ?? null);
  useEffect(() => { set({ module, ctx: JSON.parse(json) }); }, [module, json, set]);
}

export const useTutorState = () => useContext(StateCtx);

/** Unsichtbare Komponente: meldet den Spielstand eines Moduls an den Assistenten. */
export function Tutor({ module, ctx }) {
  useTutor(module, ctx);
  return null;
}
