// Proof by pointing: what point_actions and point_run print (pure, no
// React; tested by tests/point-show-unit.mjs)

// An action of point_actions: [kind] point takes one part, link two, show
// one (its text is shown, not written)
export type PointAction = { name: string; kind: "point" | "link" | "show"; doc: string };

// The actions of the JSON array printed by point_actions (the entries of
// another kind left out); null if it is not an array
export function parseActions(json: string): PointAction[] | null {
  try {
    const a: unknown = JSON.parse(json);
    if (!Array.isArray(a)) return null;
    return a.filter(
      (x): x is PointAction => typeof x?.name === "string" && (x.kind === "point" || x.kind === "link" || x.kind === "show"),
    ).map((x) => ({ name: x.name, kind: x.kind, doc: typeof x.doc === "string" ? x.doc : "" }));
  } catch {
    return null;
  }
}

// What the last notice [printed] of point_run gives: the line to write
// (kinds point and link), or the text to show (kind show: its lines kept,
// without the blank lines around)
export const pointLine = (printed: string) => printed.trim();
export const shownText = (printed: string) => printed.replace(/^\s*\n/, "").trimEnd();
