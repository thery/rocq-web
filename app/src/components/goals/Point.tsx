// Proof by pointing: a part of a goal selected with the mouse (in its
// conclusion, or in the type of a hypothesis), a button next to the
// selection writes the pbp line that brings it to the surface
// (hooks/usePoint.ts). "Link…" keeps the selection (highlighted), the next
// one is linked with it; Escape forgets it.
import { type RefObject, useEffect, useState } from "react";
import type { Pointed } from "../../hooks/usePoint";

const nonBlanks = (s: string) => [...s].filter((c) => !/\s/.test(c)).length;

// What [r] selects in [root]: a part (data-part) of a goal (data-goal),
// both its ends in it
function pointed(root: HTMLElement, r: Range): Pointed | null {
  const partOf = (n: Node) => (n instanceof Element ? n : n.parentElement)?.closest<HTMLElement>("[data-part]");
  const part = partOf(r.startContainer);
  const goal = part?.closest<HTMLElement>("[data-goal]");
  if (!part || !goal || !root.contains(part) || partOf(r.endContainer) !== part) return null;
  const upTo = (n: Node, o: number) => {
    const before = document.createRange();
    before.setStart(part, 0);
    before.setEnd(n, o);
    return nonBlanks(before.toString());
  };
  return { goal: Number(goal.dataset.goal), hyp: part.dataset.hyp, start: upTo(r.startContainer, r.startOffset), end: upTo(r.endContainer, r.endOffset) };
}

type Selected = { p: Pointed; range: Range };

// (CSS.highlights: Chrome 105, Firefox 140, Safari 17.2)
function highlight(range: Range | null) {
  const hs = typeof CSS !== "undefined" ? CSS.highlights : undefined;
  if (!hs) return;
  if (range) hs.set("pbp-first", new Highlight(range));
  else hs.delete("pbp-first");
}

// [root]: the goals; [goals]: they changed (the selections forgotten)
export function PointBar({ root, goals, point }: {
  root: RefObject<HTMLElement | null>;
  goals: unknown;
  point: (ps: Pointed[]) => Promise<string | null>;
}) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [first, setFirst] = useState<Selected | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    const change = () => {
      const s = document.getSelection();
      const r = s && s.rangeCount > 0 && !s.isCollapsed ? s.getRangeAt(0) : null;
      const p = r && root.current ? pointed(root.current, r) : null;
      setSelected(p && r ? { p, range: r.cloneRange() } : null);
      setStatus(null);
    };
    document.addEventListener("selectionchange", change);
    return () => document.removeEventListener("selectionchange", change);
  }, [root]);
  useEffect(() => {
    setSelected(null);
    setFirst(null);
  }, [goals]);
  useEffect(() => {
    highlight(first?.range ?? null);
    if (!first) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setFirst(null);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [first]);
  const shown = selected ?? first;
  if (!shown) return null;
  const run = async () => {
    if (!selected) return;
    setStatus("…");
    const error = await point(first ? [first.p, selected.p] : [selected.p]);
    setStatus(error);
    if (error) return;
    setFirst(null);
    document.getSelection()?.removeAllRanges();
  };
  const keep = () => {
    setFirst(selected);
    document.getSelection()?.removeAllRanges();
  };
  // (below the selection's end, inside the window)
  const box = shown.range.getBoundingClientRect();
  const style = { left: Math.max(4, Math.min(box.right, window.innerWidth - 330)), top: box.bottom + 4 };
  return (
    // (a click on it keeps the selection)
    <div className="point-bar" style={style} onMouseDown={(e) => e.preventDefault()} data-testid="point-bar">
      {selected ? (
        <button onClick={run} title={first ? "Write the pbp line linking the two parts" : "Write the pbp line that brings this part to the surface"}>
          {first ? "Link" : "Point"}
        </button>
      ) : (
        <span className="muted">Select the part to link it with</span>
      )}
      {selected && !first && (
        <button onClick={keep} title="Keep this part, then select the one to link it with">
          Link…
        </button>
      )}
      {first && (
        <button onClick={() => setFirst(null)} title="Forget the first part (Escape)" aria-label="Cancel">
          ✕
        </button>
      )}
      {status && <span className={status === "…" ? "muted" : "error"} title={status}>{status}</span>}
    </div>
  );
}
