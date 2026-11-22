// The header's sign of a temporary session (?temp): clicked, what it means
// and a button that keeps its files (lib/keep.ts)
import { Hourglass } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function TemporaryBadge({ keep, compact }: { keep: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={root} className="temporary">
      <button
        className="temporary-badge"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Temporary session"
        title="Nothing is saved in this browser"
      >
        <Hourglass size={13} />
        {!compact && " Temporary session"}
      </button>
      {open && (
        <div className="temporary-popover" role="dialog" aria-label="Temporary session">
          <p>Nothing is saved in this browser, and closing the page loses the changes. Your own files are left as they are.</p>
          <button className="button" onClick={keep} title="Copy these files into your workspace, and leave the session">
            Keep these files
          </button>
        </div>
      )}
    </span>
  );
}
