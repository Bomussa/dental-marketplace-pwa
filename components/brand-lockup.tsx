import { ToothIcon } from "@/components/icons";

type BrandLockupProps = {
  brandName: string;
  systemName: string;
  compact?: boolean;
  tone?: "light" | "dark";
};

export function BrandLockup({ brandName, systemName, compact = false, tone = "light" }: BrandLockupProps) {
  const isLight = tone === "light";

  return (
    <span className={`brand-lockup ${compact ? "brand-lockup--compact" : ""} ${isLight ? "brand-lockup--light" : "brand-lockup--dark"}`}>
      <span className="brand-lockup__mark" aria-hidden="true">
        <ToothIcon size={compact ? 22 : 30} />
        <span className="brand-lockup__pulse" />
      </span>
      <span className="brand-lockup__copy">
        <span className="brand-lockup__system" dir="ltr">{systemName}</span>
        <span className="brand-lockup__brand">{brandName}</span>
      </span>
    </span>
  );
}
