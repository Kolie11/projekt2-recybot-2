import { useCallback, useEffect, useRef, useState } from "react";

// Fehler werden als Code zurückgegeben; die Übersetzung passiert in der Ansicht.
const CODES = {
  NotAllowedError: "denied", SecurityError: "denied", NotFoundError: "notfound",
  OverconstrainedError: "constraints", NotReadableError: "busy", AbortError: "generic"
};

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("off"); // off | starting | on | error
  const [error, setError] = useState(null);     // { code, detail }
  const [facing, setFacing] = useState("environment");
  const [hasMultiple, setHasMultiple] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("off");
  }, []);

  const start = useCallback(async facingMode => {
    const mode = facingMode || facing;
    setError(null);
    if (!window.isSecureContext) { setStatus("error"); setError({ code: "insecure" }); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("error"); setError({ code: "unsupported" }); return; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStatus("starting");
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 640 }, height: { ideal: 640 } }, audio: false });
      } catch (e) {
        if (e.name !== "OverconstrainedError") throw e;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream; video.muted = true; video.playsInline = true;
      await video.play();
      setFacing(mode); setStatus("on");
      try { setHasMultiple((await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput").length > 1); } catch { /* egal */ }
    } catch (e) {
      console.error(e);
      setStatus("error");
      setError({ code: CODES[e.name] || "generic", detail: e.message || e.name });
    }
  }, [facing]);

  const switchCamera = useCallback(() => start(facing === "environment" ? "user" : "environment"), [facing, start]);
  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

  return { videoRef, status, error, facing, hasMultiple, start, stop, switchCamera };
}
