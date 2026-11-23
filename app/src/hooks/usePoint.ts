// Proof by pointing (pbp_select.v of github.com/thery/coq_tmp): parts of a
// goal selected in the goals panel become the arguments of the tactic
// `elpi pbp_pattern`, run after the sentence the goals are shown for (as a
// query: the document unchanged); the pbp line it prints is written after
// that sentence, its warnings and errors in the log; checked at once if
// asked (step by step, the checking moved to its end; else the cursor,
// put after it, shows the goals after it).
import { type RefObject, useCallback } from "react";
import type { EditorHandle } from "../components/editor/Editor";
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

const NOTICE = 3;

// The arguments of pbp_pattern: one part, or two linked (the hypothesis
// first when the other one is in the conclusion)
function args(ps: Pointed[]) {
  const [a, b] = ps.length === 2 && !ps[0].hyp && ps[1].hyp ? [ps[1], ps[0]] : ps;
  const one = (p: Pointed) => [p.hyp, p.start, p.end].filter((x) => x !== undefined).join(" ");
  if (!b) return one(a);
  return a.hyp && !b.hyp ? `${one(a)} ${b.start} ${b.end}` : `${one(a)} ${one(b)}`;
}

export function usePoint({ session, ws, doc, editor, log }: {
  session: Session;
  ws: Workspace;
  doc: Document;
  editor: RefObject<EditorHandle | null>;
  log: (m: string) => void;
}) {
  // (the error, or null once the line is written)
  return useCallback(
    async (ps: Pointed[], check: boolean): Promise<string | null> => {
      const c = session.client.current;
      const active = ws.current.current.active;
      const at = doc.goals?.at;
      if (!c || !session.ready.current || !isRocq(active) || !at) return "No goal here.";
      if (ps.some((p) => p.goal !== ps[0].goal)) return "The two parts are not in the same goal.";
      // (a goal selector for another goal than the first)
      const goal = ps[0].goal > 0 ? `${ps[0].goal + 1}: ` : "";
      const command = `${goal}elpi pbp_pattern ${args(ps)}.`;
      let feedback: [number, string][];
      try {
        feedback = (await c.run(workerUri(active), doc.version.current, at, command)).feedback;
      } catch (e) {
        const m = (e as Error).message.replace(/^Coq: /, "");
        log(`${command} ${m}`);
        return m.replace(/^Tactic failure: pbp_pattern: /, "");
      }
      for (const [level, m] of feedback) if (level < NOTICE) log(`${command} ${m}`);
      const line = feedback.filter(([level]) => level === NOTICE).at(-1)?.[1];
      if (!line) return "pbp_pattern printed no line.";
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
    [session, ws, doc, editor, log],
  );
}
