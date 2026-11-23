// Proof by pointing: a part of a goal selected with the mouse (in its
// conclusion, or in the type of a hypothesis), a bar next to the selection
// shows the pointing actions declared in Rocq (hooks/usePoint.ts), one
// button each, its doc as tooltip; one of kind point writes its line for
// the part. One of kind link ("Name…") keeps the part (highlighted), the
// next one is linked with it ("Name"); Escape forgets it. "check": the line
// written is checked at once (remembered).
import { type RefObject, useEffect, useRef, useState } from "react";
import { usePersistentState } from "../../hooks/usePersistentState";
import type { PointAction, Pointed, Pointing } from "../../hooks/usePoint";

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

// [root]: the goals; [goals]: they changed (the selections forgotten, the
// actions asked again)
export function PointBar({ root, goals, point }: {
  root: RefObject<HTMLElement | null>;
  goals: unknown;
  point: Pointing;
}) {
  const [selected, setSelected] = useState<Selected | null>(null);
  // (the first part of a link, and its action)
  const [first, setFirst] = useState<(Selected & { action: PointAction }) | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [check, setCheck] = usePersistentState("point-check", false);
  // the actions of the goals shown (asked once a part is selected), or
  // why there are none
  const [actions, setActions] = useState<{ for: unknown; list: PointAction[] | string } | null>(null);
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
  const asked = useRef<unknown>(undefined);
  useEffect(() => {
    if (!selected || asked.current === goals) return;
    asked.current = goals;
    point.actions().then((list) => {
      if (asked.current === goals) setActions({ for: goals, list });
    });
  }, [selected, goals, point]);
  useEffect(() => {
    highlight(first?.range ?? null);
    if (!first) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setFirst(null);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [first]);
  const shown = selected ?? first;
  if (!shown) return null;
  const list = actions && actions.for === goals ? actions.list : null;
  const run = async (action: PointAction) => {
    if (!selected) return;
    setStatus("…");
    const error = await point.run(action.name, first ? [first.p, selected.p] : [selected.p], check);
    setStatus(error);
    if (error) return;
    setFirst(null);
    document.getSelection()?.removeAllRanges();
  };
  const keep = (action: PointAction) => {
    if (!selected) return;
    setFirst({ ...selected, action });
    setStatus(null);
    document.getSelection()?.removeAllRanges();
  };
  // (below the selection's end, inside the window)
  const box = shown.range.getBoundingClientRect();
  const style = { left: Math.max(4, Math.min(box.right, window.innerWidth - 430)), top: box.bottom + 4 };
  return (
    // (a click on it keeps the selection)
    <div className="point-bar" style={style} onMouseDown={(e) => e.preventDefault()} data-testid="point-bar">
      {first ? (
        selected ? (
          <button onClick={() => run(first.action)} title={first.action.doc || undefined}>
            {first.action.name}
          </button>
        ) : (
          <span className="muted">Select the part to link it with</span>
        )
      ) : list === null ? (
        <span className="muted">…</span>
      ) : typeof list === "string" ? (
        <span className="muted" title={`No pointing actions loaded here (From coq_tmp Require Import point_actions.): ${list}`} data-testid="no-actions">
          No pointing actions
        </span>
      ) : list.length === 0 ? (
        <span className="muted">No pointing actions</span>
      ) : (
        list.map((a) =>
          a.kind === "point" ? (
            <button key={a.name} onClick={() => run(a)} title={a.doc || undefined}>
              {a.name}
            </button>
          ) : (
            <button key={a.name} onClick={() => keep(a)} title={`${a.doc ? `${a.doc}. ` : ""}Keep this part, then select the second one`}>
              {a.name}…
            </button>
          ),
        )
      )}
      {first && (
        <button onClick={() => setFirst(null)} title="Forget the first part (Escape)" aria-label="Cancel">
          ✕
        </button>
      )}
      <label title="Check the line once written">
        <input type="checkbox" checked={check} onChange={(e) => setCheck(e.target.checked)} /> check
      </label>
      {status && <span className={status === "…" ? "muted" : "error"} title={status}>{status}</span>}
    </div>
  );
}
