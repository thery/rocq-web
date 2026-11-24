// Proof by pointing (point_actions.v of github.com/thery/coq_tmp): the
// actions offered on parts of a goal selected in the goals panel are
// declared in Rocq; `elpi point_actions` lists them (a JSON notice), `elpi
// point_run "Name" ...` gives the line of one for the selections. Both are
// run after the sentence the goals are shown for (as queries: the document
// unchanged); the line printed is written after that sentence, its warnings
// and errors in the log; checked at once if asked (step by step, the
// checking moved to its end; else the cursor, put after it, shows the goals
// after it). An action of kind show writes nothing: the text point_run
// prints is shown (in the bar).
import { type RefObject, useCallback, useMemo } from "react";
import type { EditorHandle } from "../components/editor/Editor";
import { type PointAction, parseActions, pointLine, shownText } from "../lib/pointActions";
import { offsetAt, positionAt, sentenceAt, sentences } from "../lib/sentences";
import { isRocq } from "../lib/storage";
import { workerUri } from "../lib/workspaces";
import type { Document } from "./useDocument";
import type { Session } from "./useRocqSession";
import type { Workspace } from "./useWorkspace";

// A part of the goal [goal] (0: the first one): of its conclusion, or of
// the type of hypothesis [hyp]; [start, end[ counts the characters that are
// not blanks of its text as shown
export type Pointed = { goal: number; hyp?: string; start: number; end: number };

export type { PointAction };

export type Pointing = {
  // the actions where the goals are shown, or why there are none
  actions: () => Promise<PointAction[] | string>;
  // writes the line of the action [name] for the parts [ps] (the error, or
  // null once the line is written)
  run: (name: string, ps: Pointed[], check: boolean) => Promise<string | null>;
  // the text of the action [name] (of kind show) for the part [p]: written
  // nothing
  show: (name: string, p: Pointed) => Promise<{ text: string } | { error: string }>;
};

const NOTICE = 3;

// The selections of point_run: the parts in the order they were selected
// (the first is X of the pattern, the second Y)
const args = (ps: Pointed[]) => ps.map((p) => [p.hyp, p.start, p.end].filter((x) => x !== undefined).join(" ")).join(" ");
// (a Rocq string)
const quoted = (s: string) => `"${s.replaceAll('"', '""')}"`;

export function usePoint({ session, ws, doc, editor, log }: {
  session: Session;
  ws: Workspace;
  doc: Document;
  editor: RefObject<EditorHandle | null>;
  log: (m: string) => void;
}): Pointing {
  // [command] run after the sentence the goals are shown for: its
  // feedback, or the error (the text after "Tactic failure: [tactic]: ")
  const query = useCallback(
    async (command: string, tactic: string, quiet = false): Promise<[number, string][] | string> => {
      const c = session.client.current;
      const active = ws.current.current.active;
      const at = doc.goals?.at;
      if (!c || !session.ready.current || !isRocq(active) || !at) return "No goal here.";
      try {
        const { feedback } = await c.run(workerUri(active), doc.version.current, at, command);
        if (!quiet) for (const [level, m] of feedback) if (level < NOTICE) log(`${command} ${m}`);
        return feedback;
      } catch (e) {
        const m = (e as Error).message.replace(/^Coq: /, "");
        if (!quiet) log(`${command} ${m}`);
        return m.replace(new RegExp(`^Tactic failure: ${tactic}: `), "");
      }
    },
    [session, ws, doc, log],
  );

  const actions = useCallback(async () => {
    const r = await query("elpi point_actions.", "point_actions", true);
    if (typeof r === "string") return r;
    const json = r.filter(([level]) => level === NOTICE).at(-1)?.[1];
    return (json && parseActions(json)) || "point_actions printed no list.";
  }, [query]);

  // what point_run prints for the action [name] on the parts [ps] (its last
  // notice), or the error
  const output = useCallback(
    async (name: string, ps: Pointed[]): Promise<{ text: string } | { error: string }> => {
      const goal = ps[0].goal > 0 ? `${ps[0].goal + 1}: ` : "";
      const r = await query(`${goal}elpi point_run ${quoted(name)} ${args(ps)}.`, "point_run");
      if (typeof r === "string") return { error: r };
      const text = r.filter(([level]) => level === NOTICE).at(-1)?.[1];
      return text ? { text } : { error: "point_run printed nothing." };
    },
    [query],
  );

  const run = useCallback(
    async (name: string, ps: Pointed[], check: boolean): Promise<string | null> => {
      if (ps.some((p) => p.goal !== ps[0].goal)) return "The two parts are not in the same goal.";
      // (a goal selector for another goal than the first)
      const goal = ps[0].goal > 0 ? `${ps[0].goal + 1}: ` : "";
      const r = await output(name, ps);
      if ("error" in r) return r.error;
      const line = pointLine(r.text);
      const active = ws.current.current.active;
      const at = doc.goals?.at;
      if (!at) return "No goal here.";
      // after the sentence: on a line of its own, indented as it, when
      // nothing follows it on its line
      const text = ws.read(active);
      const s = sentenceAt(sentences(text), offsetAt(text, at));
      const end = s ? s.end : offsetAt(text, at);
      const eol = text.indexOf("\n", end) < 0 ? text.length : text.indexOf("\n", end);
      const lineStart = text.lastIndexOf("\n", (s?.start ?? end) - 1) + 1;
      const indent = /^[ \t]*/.exec(text.slice(lineStart))![0];
      const [from, written] = /^\s*$/.test(text.slice(end, eol)) ? [eol, `\n${indent}${goal}${line}`] : [end, ` ${goal}${line}`];
      editor.current?.insertAt(positionAt(text, from), written);
      if (check && doc.stepByStep) doc.move("cursor", positionAt(ws.read(active), from + written.length));
      return null;
    },
    [output, ws, doc, editor],
  );

  const show = useCallback(
    async (name: string, p: Pointed) => {
      const r = await output(name, [p]);
      return "error" in r ? r : { text: shownText(r.text) };
    },
    [output],
  );

  return useMemo(() => ({ actions, run, show }), [actions, run, show]);
}
