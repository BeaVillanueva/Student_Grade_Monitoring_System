import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { tones, toneIcons, type Tone } from "./display";
import { cn } from "@/lib/utils";
type Notice = { title: string; description?: string; tone?: Tone };
const ToastContext = createContext<((notice: Notice) => void) | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<(Notice & { id: number })[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const sequence = useRef(0);
  function notify(notice: Notice) {
    const id = ++sequence.current;
    setNotices((items) => [...items.slice(-4), { ...notice, id }]);
    setAnnouncement(`${notice.title}. ${notice.description ?? ""}`);
  }
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
      <section
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[60] flex max-h-[70svh] w-[calc(100%-2rem)] max-w-sm flex-col gap-3 overflow-y-auto"
      >
        {notices.map(({ id, title, description, tone = "info" }) => {
          const Icon = toneIcons[tone];
          return (
            <div
              key={id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 shadow-lg",
                tones[tone],
              )}
            >
              <Icon className="mt-1 size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1 break-words text-sm">
                <p className="font-semibold">{title}</p>
                {description && <p className="mt-1">{description}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 -mt-2 text-inherit"
                aria-label={`Dismiss notification: ${title}`}
                onClick={() =>
                  setNotices((items) => items.filter((item) => item.id !== id))
                }
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </section>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast requires ToastProvider");
  return notify;
}
