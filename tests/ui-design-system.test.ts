import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const header = readFileSync(resolve(process.cwd(), "components/site-header.tsx"), "utf8");

describe("shared UI design system", () => {
  it("keeps the semantic visual tokens and reduced-motion protection in the single global stylesheet", () => {
    expect(stylesheet).toContain("--surface-page");
    expect(stylesheet).toContain("--text-strong");
    expect(stylesheet).toContain("--focus-ring");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
    expect(stylesheet).not.toContain("ambient-drift");
  });

  it("preserves accessible labels for compact mobile navigation controls", () => {
    expect(header).toContain('aria-label={t["nav.clinics"]}');
    expect(header).toContain('aria-label={signedIn ? t["nav.account"] : t["nav.login"]}');
  });
});
