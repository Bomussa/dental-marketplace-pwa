"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  // A tangible client boundary is required so this registration effect is
  // hydrated and executed by the browser. The marker remains non-visual.
  return <span aria-hidden="true" className="hidden" />;
}
