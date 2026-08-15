"use client";

import { useEffect } from "react";
import { deviceInstallationPayload } from "@/lib/device-installation.client";

export function DeviceInstallationRegistrar() {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/device-installations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(deviceInstallationPayload()),
      keepalive: true,
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  return null;
}
