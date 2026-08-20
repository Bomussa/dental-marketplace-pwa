import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bookingIntentKey, clearBookingIntent } from "@/lib/booking-intent.client";

const store = new Map<string, string>();
const knownIntents = [
  ["offer-a", "slot-a", "default"],
  ["offer-b", "slot-a", "default"],
  ["offer-a", "slot-a", "profile-parent"],
  ["offer-a", "slot-a", "profile-child"],
] as const;

function installBrowserStorage() {
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
}

function installUnavailableBrowserStorage() {
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: () => { throw new Error("storage unavailable"); },
      setItem: () => { throw new Error("storage unavailable"); },
      removeItem: () => { throw new Error("storage unavailable"); },
    },
  });
}

describe("booking intent key", () => {
  beforeEach(() => {
    store.clear();
    installBrowserStorage();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "11111111-1111-4111-8111-111111111111") });
  });

  afterEach(() => {
    for (const [offerId, slotId, profileId] of knownIntents) {
      clearBookingIntent(offerId, slotId, profileId);
    }
    vi.unstubAllGlobals();
  });

  it("reuses one key for retries of the same offer and slot", () => {
    expect(bookingIntentKey("offer-a", "slot-a")).toBe("11111111-1111-4111-8111-111111111111");
    expect(bookingIntentKey("offer-a", "slot-a")).toBe("11111111-1111-4111-8111-111111111111");
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("uses independent keys for a different booking intent", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn()
        .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
        .mockReturnValueOnce("22222222-2222-4222-8222-222222222222"),
    });
    expect(bookingIntentKey("offer-a", "slot-a")).toBe("11111111-1111-4111-8111-111111111111");
    expect(bookingIntentKey("offer-b", "slot-a")).toBe("22222222-2222-4222-8222-222222222222");
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
  });

  it("uses separate retry keys for different family patient profiles", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn()
        .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
        .mockReturnValueOnce("22222222-2222-4222-8222-222222222222"),
    });
    expect(bookingIntentKey("offer-a", "slot-a", "profile-parent")).toBe("11111111-1111-4111-8111-111111111111");
    expect(bookingIntentKey("offer-a", "slot-a", "profile-child")).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("clears a resolved intent so a later attempt receives a fresh key", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn()
        .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
        .mockReturnValueOnce("22222222-2222-4222-8222-222222222222"),
    });
    bookingIntentKey("offer-a", "slot-a");
    clearBookingIntent("offer-a", "slot-a");
    expect(bookingIntentKey("offer-a", "slot-a")).toBe("22222222-2222-4222-8222-222222222222");
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
  });

  it("reuses the same retry key when session storage is unavailable", () => {
    installUnavailableBrowserStorage();
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn()
        .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
        .mockReturnValueOnce("22222222-2222-4222-8222-222222222222"),
    });

    expect(bookingIntentKey("offer-a", "slot-a")).toBe("11111111-1111-4111-8111-111111111111");
    expect(bookingIntentKey("offer-a", "slot-a")).toBe("11111111-1111-4111-8111-111111111111");
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("clears the in-memory fallback after a resolved intent", () => {
    installUnavailableBrowserStorage();
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn()
        .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
        .mockReturnValueOnce("22222222-2222-4222-8222-222222222222"),
    });

    expect(bookingIntentKey("offer-a", "slot-a")).toBe("11111111-1111-4111-8111-111111111111");
    clearBookingIntent("offer-a", "slot-a");
    expect(bookingIntentKey("offer-a", "slot-a")).toBe("22222222-2222-4222-8222-222222222222");
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2);
  });
});
