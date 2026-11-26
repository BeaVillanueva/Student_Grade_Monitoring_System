import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/overlays";
export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError(false);
        }
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent title={title} description={description}>
        {error && (
          <p role="alert" className="w-full text-sm text-red-700">
            The action could not be completed. Please try again.
          </p>
        )}
        <AlertDialogCancel asChild>
          <Button variant="outline" disabled={pending}>
            Cancel
          </Button>
        </AlertDialogCancel>
        <AlertDialogAction asChild>
          <Button
            variant={destructive ? "destructive" : "primary"}
            disabled={pending}
            onClick={async (event) => {
              event.preventDefault();
              setPending(true);
              setError(false);
              try {
                await onConfirm();
                setOpen(false);
              } catch {
                setError(true);
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Please wait…" : confirmLabel}
          </Button>
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}
