import { useRef, type ComponentProps, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertPrimitive from "@radix-ui/react-alert-dialog";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
const overlayClass = "fixed inset-0 z-40 bg-slate-950/60";
const panelClass =
  "fixed left-1/2 top-1/2 z-50 max-h-[90svh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-lg border bg-card p-4 shadow-[0_24px_64px_rgba(15,23,42,0.28),0_8px_24px_rgba(15,23,42,0.18)] [overflow-wrap:anywhere] sm:max-h-[85svh] sm:p-6";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({
  title,
  description,
  children,
  className,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description: string;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(panelClass, className)}
        {...props}
        onOpenAutoFocus={(event) => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (
            !event.defaultPrevented &&
            opener.current?.isConnected &&
            opener.current !== document.body
          ) {
            event.preventDefault();
            opener.current.focus({ preventScroll: true });
          }
        }}
      >
        <DialogPrimitive.Title className="pr-10 text-lg font-semibold leading-7">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
        <div className="mt-6">{children}</div>
        <DialogPrimitive.Close asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3"
            aria-label="Close dialog"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTrigger = AlertPrimitive.Trigger;
export const AlertDialogCancel = AlertPrimitive.Cancel;
export const AlertDialogAction = AlertPrimitive.Action;
export function AlertDialogContent({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className={cn(overlayClass, "z-60")} />
      <AlertPrimitive.Content className={cn(panelClass, "z-70")}>
        <AlertPrimitive.Title className="text-lg font-semibold">
          {title}
        </AlertPrimitive.Title>
        <AlertPrimitive.Description className="mt-2 text-sm text-muted-foreground">
          {description}
        </AlertPrimitive.Description>
        <div className="mt-6 flex flex-wrap justify-end gap-3">{children}</div>
      </AlertPrimitive.Content>
    </AlertPrimitive.Portal>
  );
}
export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export function DropdownMenuContent({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={6}
        className={cn(
          "z-50 min-w-44 rounded-md border bg-card p-1 shadow-lg",
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}
export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex min-h-control cursor-default items-center gap-2 rounded-sm px-3 text-sm outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-primary data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
export const TooltipProvider = TooltipPrimitive.Provider;
export function Tooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 max-w-64 rounded-md bg-foreground px-3 py-2 text-xs text-white shadow-sm"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-foreground" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
