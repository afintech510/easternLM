"use client";

import { useEffect, useRef, useState } from "react";
import { captureUtm, onToast } from "./events";

/** The artifact's bottom toast. Also captures landing UTMs once per session. */
export function Toast() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    captureUtm();
    return onToast((m) => {
      setMsg(m);
      setShow(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(false), 3800);
    });
  }, []);

  return (
    <div id="toast" role="status" aria-live="polite" className={show ? "show" : undefined}>
      {msg}
    </div>
  );
}
