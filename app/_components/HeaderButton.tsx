import type { ComponentProps, ComponentType } from "react";
import { cn } from "@/lib/utils";

// A demo-header action: an icon-only round button on phones, icon plus label
// from `sm` up. The label is always the accessible name (override with `aria-label`).
export function HeaderButton({
  icon: Icon,
  label,
  className,
  ...props
}: { icon: ComponentType<{ className?: string }>; label: string } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/15 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.04] sm:size-auto sm:px-3.5 sm:py-1.5",
        className,
      )}
      {...props}
    >
      <Icon className="size-4 sm:size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
