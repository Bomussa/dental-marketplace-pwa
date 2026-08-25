import { describe, expect, it } from "vitest";
import { clientBookingStatusTone, parseClientBookingPage, parseClientBookingView } from "@/lib/client-booking-workspace";

describe("client booking workspace", () => {
  it("defaults unknown or absent views to the attention queue", () => {
    expect(parseClientBookingView(undefined)).toBe("attention");
    expect(parseClientBookingView("unexpected")).toBe("attention");
    expect(parseClientBookingView("upcoming")).toBe("upcoming");
    expect(parseClientBookingView("history")).toBe("history");
  });

  it("normalizes the page number to a safe positive integer", () => {
    expect(parseClientBookingPage(undefined)).toBe(1);
    expect(parseClientBookingPage("0")).toBe(1);
    expect(parseClientBookingPage("1.5")).toBe(1);
    expect(parseClientBookingPage("3")).toBe(3);
    expect(parseClientBookingPage("99999")).toBe(10_000);
  });

  it("uses a semantic tone for every booking state", () => {
    expect(clientBookingStatusTone("pending_clinic_confirmation")).toBe("amber");
    expect(clientBookingStatusTone("confirmed")).toBe("green");
    expect(clientBookingStatusTone("checked_in")).toBe("green");
    expect(clientBookingStatusTone("completed")).toBe("green");
    expect(clientBookingStatusTone("clinic_cancelled")).toBe("red");
    expect(clientBookingStatusTone("no_show")).toBe("red");
    expect(clientBookingStatusTone("unknown")).toBe("slate");
  });
});
