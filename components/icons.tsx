import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) { return <IconBase {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></IconBase>; }
export function LocationIcon(props: IconProps) { return <IconBase {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></IconBase>; }
export function CalendarIcon(props: IconProps) { return <IconBase {...props}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></IconBase>; }
export function ToothIcon(props: IconProps) { return <IconBase {...props}><path d="M12 4.2c-1.8 0-2.8-1.2-4.7-1.2C4.7 3 3 5 3 7.7c0 2.1.8 3.6 1.7 5.2.8 1.4 1.3 3.1 1.5 5 .1 1.5.7 3.1 2.1 3.1 1.1 0 1.5-1.1 1.8-2.5.4-1.8.9-3.3 1.9-3.3s1.5 1.5 1.9 3.3c.3 1.4.7 2.5 1.8 2.5 1.4 0 2-1.6 2.1-3.1.2-1.9.7-3.6 1.5-5 .9-1.6 1.7-3.1 1.7-5.2C21 5 19.3 3 16.7 3 14.8 3 13.8 4.2 12 4.2Z"/></IconBase>; }
export function SparklesIcon(props: IconProps) { return <IconBase {...props}><path d="m12 3 1.1 3.4a4 4 0 0 0 2.5 2.5L19 10l-3.4 1.1a4 4 0 0 0-2.5 2.5L12 17l-1.1-3.4a4 4 0 0 0-2.5-2.5L5 10l3.4-1.1a4 4 0 0 0 2.5-2.5L12 3Z"/><path d="m19 16 .5 1.5A2.2 2.2 0 0 0 21 19l-1.5.5A2.2 2.2 0 0 0 18 21l-.5-1.5A2.2 2.2 0 0 0 16 18l1.5-.5A2.2 2.2 0 0 0 19 16Z"/></IconBase>; }
export function CheckIcon(props: IconProps) { return <IconBase {...props}><path d="m5 12 4 4L19 6"/></IconBase>; }
export function ShieldCheckIcon(props: IconProps) { return <IconBase {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></IconBase>; }
export function StarIcon(props: IconProps) { return <IconBase {...props}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></IconBase>; }
export function ClockIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></IconBase>; }
export function UserIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></IconBase>; }
export function BuildingIcon(props: IconProps) { return <IconBase {...props}><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/><path d="M9 7h3M9 11h3M9 15h3M3 21h18M17 9h2a2 2 0 0 1 2 2v10"/></IconBase>; }
export function ChevronLeftIcon(props: IconProps) { return <IconBase {...props}><path d="m15 18-6-6 6-6"/></IconBase>; }
export function ArrowUpLeftIcon(props: IconProps) { return <IconBase {...props}><path d="M17 17 7 7M17 7H7v10"/></IconBase>; }
export function SlidersIcon(props: IconProps) { return <IconBase {...props}><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></IconBase>; }
export function WalletIcon(props: IconProps) { return <IconBase {...props}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6.5Z"/><path d="M4 8h16M15 14h5"/></IconBase>; }
export function RouteIcon(props: IconProps) { return <IconBase {...props}><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h2a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4"/></IconBase>; }
