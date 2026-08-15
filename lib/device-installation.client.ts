"use client";

const installationStorageKey = "asnani_installation_id_v1";

export function getInstallationId() {
  try {
    const existing = window.localStorage.getItem(installationStorageKey);
    if (existing) return existing;
    const installationId = crypto.randomUUID();
    window.localStorage.setItem(installationStorageKey, installationId);
    return installationId;
  } catch {
    return crypto.randomUUID();
  }
}

function deviceClass() {
  const width = window.innerWidth;
  if (width < 768) return "mobile" as const;
  if (width < 1200) return "tablet" as const;
  return "desktop" as const;
}

function browserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/CriOS\//.test(ua) || /Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Unknown";
}

export function deviceInstallationPayload() {
  return {
    installation_id: getInstallationId(),
    platform: navigator.platform || undefined,
    browser: browserName(),
    device_class: deviceClass(),
    app_version: process.env.NEXT_PUBLIC_APP_VERSION,
  };
}
