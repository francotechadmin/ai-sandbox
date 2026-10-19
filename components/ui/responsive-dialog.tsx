"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";

import { cn } from "@/lib/utils";

// A modal that is a swipe-to-dismiss bottom drawer on phones and a centered
// dialog from the `sm` breakpoint up (matching Tailwind's `sm:`).
const QUERY = "(max-width: 639px)";
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const useIsPhone = () =>
  React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );

const PhoneContext = React.createContext(false);

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const phone = useIsPhone();
  return (
    <PhoneContext.Provider value={phone}>
      {phone ? (
        <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
          {children}
        </Drawer.Root>
      ) : (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog.Root>
      )}
    </PhoneContext.Provider>
  );
}

export function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const phone = React.useContext(PhoneContext);

  if (phone) {
    return (
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(0.6*(1-var(--drawer-swipe-progress)))] transition-opacity duration-300 data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
          <Drawer.Popup
            {...(props as object)}
            className={cn(
              "border-line bg-panel text-text max-h-[80dvh] w-full touch-auto overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 pb-[env(safe-area-inset-bottom)] outline-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] [transform:translateY(var(--drawer-swipe-movement-y))] data-swiping:select-none data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)]",
              className,
            )}
          >
            <div className="bg-panel sticky top-0 z-10 flex justify-center pt-2.5 pb-1" data-testid="drawer-handle" aria-hidden>
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <Drawer.Content>{children}</Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    );
  }

  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
      <Dialog.Popup
        {...(props as object)}
        className={cn(
          "border-line bg-panel text-text fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border outline-none transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
          className,
        )}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

export function ResponsiveDialogTitle(props: React.ComponentProps<"h2">) {
  const phone = React.useContext(PhoneContext);
  return phone ? <Drawer.Title {...props} /> : <Dialog.Title {...props} />;
}

export function ResponsiveDialogDescription(props: React.ComponentProps<"p">) {
  const phone = React.useContext(PhoneContext);
  return phone ? <Drawer.Description {...props} /> : <Dialog.Description {...props} />;
}
