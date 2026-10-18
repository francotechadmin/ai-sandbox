"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon, ChevronDownIcon, LayoutGridIcon } from "lucide-react";
import { DEMOS } from "../demos";

const item =
  "flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-text/80 outline-none data-highlighted:bg-white/[0.06] data-highlighted:text-text";

// Breadcrumb tail for a demo page: the demo's name, opening a menu to jump to
// any other demo (or back to the grid) without a trip through the homepage.
export function DemoSwitcher({ slug, label }: { slug: string; label?: string }) {
  const current = DEMOS.find((d) => d.slug === slug);
  return (
    <Menu.Root>
      <Menu.Trigger
        data-testid="demo-switcher"
        className="flex items-center gap-1 rounded-full px-2 py-1 text-[14px] font-medium tracking-tight text-text outline-none transition-colors hover:bg-white/[0.06] data-popup-open:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/30"
      >
        {label ?? current?.name ?? slug}
        <ChevronDownIcon className="size-3.5 text-text/50" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={8} className="z-50">
          <Menu.Popup className="min-w-56 rounded-xl border border-line bg-panel2 p-1.5 shadow-xl outline-none">
            {DEMOS.map((demo) => (
              <Menu.LinkItem key={demo.slug} render={<Link href={`/${demo.slug}`} />} className={item}>
                <span className="flex-1">{demo.name}</span>
                {demo.slug === slug && <CheckIcon className="size-3.5" aria-label="Current demo" />}
              </Menu.LinkItem>
            ))}
            <Menu.Separator className="my-1.5 h-px bg-line" />
            <Menu.LinkItem render={<Link href="/" />} className={item}>
              <LayoutGridIcon className="size-3.5 text-text/50" aria-hidden />
              All demos
            </Menu.LinkItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
