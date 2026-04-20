import type { WordEntry } from "@/lib/word-bank";

/** PRD 4.3 — fixed two question types */
export type QuizKind = "cloze" | "tf";

export type QuizQuestionStored =
  | {
      kind: "cloze";
      id: string;
      lemma: string;
      prompt: string;
      clozeSentence: string;
      options: string[];
      answer: string;
    }
  | {
      kind: "tf";
      id: string;
      lemma: string;
      prompt: string;
      statement: string;
      options: ["True", "False"];
      answer: "True" | "False";
    };

export type QuizQuestionPublic =
  | {
      kind: "cloze";
      id: string;
      lemma: string;
      prompt: string;
      clozeSentence: string;
      options: string[];
    }
  | {
      kind: "tf";
      id: string;
      lemma: string;
      prompt: string;
      statement: string;
      options: ["True", "False"];
    };

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const rotatePick = <T,>(items: T[], count: number, seed: string) => {
  if (items.length <= count) return [...items];
  const start = hashString(seed) % items.length;
  const output: T[] = [];
  for (let i = 0; i < count; i += 1) {
    output.push(items[(start + i) % items.length]);
  }
  return output;
};

const deterministicShuffle = <T,>(items: T[], seedInput: string): T[] => {
  const output = [...items];
  let seed = hashString(seedInput) || 1;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 选词填空 — blank from SAT example when possible */
export function buildClozeSentence(word: WordEntry): string {
  const ex = (word.enExampleSat || "").trim();
  if (!ex) {
    return `______ (${word.pos}) — ${word.enDef}`;
  }
  const re = new RegExp(`\\b${escapeRegExp(word.lemma)}\\b`, "gi");
  if (re.test(ex)) {
    return ex.replace(re, "______");
  }
  return `______ (${word.pos}) — ${word.enDef}`;
}

const KIND_ROTATION: QuizKind[] = ["cloze", "tf"];

export function buildQuestionsForWords(
  selectedWords: WordEntry[],
  scope: string,
  dayKey: string,
  allWords: WordEntry[],
): QuizQuestionStored[] {
  return selectedWords.flatMap((word, index): QuizQuestionStored[] => {
    if (!word) return [];
    const kind = KIND_ROTATION[index % 3]!;
    const seed = `${dayKey}-${scope}-${index}-${word.lemma}`;
    const others = allWords.filter((w) => w.lemma.toLowerCase() !== word.lemma.toLowerCase());

    if (kind === "cloze") {
      const distractorLemmas = rotatePick(
        others.map((w) => w.lemma),
        Math.min(3, others.length),
        `${seed}-lem`,
      );
      const options = deterministicShuffle([word.lemma, ...distractorLemmas], `${seed}-cloze-opt`);
      return [
        {
          kind: "cloze",
          id: `${scope}-${index + 1}-${word.lemma}-cloze`,
          lemma: word.lemma,
          prompt: "选词填空：选择填入空白处最恰当的词",
          clozeSentence: buildClozeSentence(word),
          options,
          answer: word.lemma,
        },
      ];
    }

    const wrongPool = others.map((w) => w.enDef).filter((d) => d && d !== word.enDef);
    const wrongDef = rotatePick(wrongPool, 1, `${seed}-tfw`)[0] ?? word.enDef;
    const useAccurate = hashString(`${seed}-tfx`) % 2 === 0;
    const statement = useAccurate ? word.enDef : wrongDef;
    const answer: "True" | "False" = useAccurate ? "True" : "False";
    return [
      {
        kind: "tf",
        id: `${scope}-${index + 1}-${word.lemma}-tf`,
        lemma: word.lemma,
        prompt: "词义判断：判断下列英文释义是否准确描述该词",
        statement,
        options: ["True", "False"],
        answer,
      },
    ];
  });
}

export function toPublicQuestion(q: QuizQuestionStored): QuizQuestionPublic {
  if (q.kind === "cloze") {
    const { kind, id, lemma, prompt, clozeSentence, options } = q;
    return { kind, id, lemma, prompt, clozeSentence, options };
  }
  const { kind, id, lemma, prompt, statement, options } = q;
  return { kind, id, lemma, prompt, statement, options };
}

export function gradeSessionAnswer(q: QuizQuestionStored, selected: string): boolean {
  return selected === q.answer;
}

/** Server-side grading with kind match + TF statement binding (anti-tamper). */
export function gradeSessionSubmit(q: QuizQuestionStored, input: QuizAnswerInput): boolean {
  if (input.kind !== q.kind) return false;
  if (input.lemma.trim().toLowerCase() !== q.lemma.trim().toLowerCase()) return false;
  if (q.kind === "tf") {
    if ((input.tfStatement ?? "").trim() !== q.statement.trim()) return false;
  }
  return input.selectedOption === q.answer;
}

/** Stateless grading when session expired (no server question snapshot). */
export type QuizAnswerInput = {
  questionId: string;
  lemma: string;
  selectedOption: string;
  kind: QuizKind;
  /** Required when kind === "tf" for TF grading and stateless replay */
  tfStatement?: string;
};

/** Correct option label for results when no session snapshot (e.g. TF). */
export function statelessCorrectOption(
  word: WordEntry | undefined,
  kind: QuizKind,
  tfStatement?: string,
): string {
  if (!word) return "";
  if (kind === "cloze") return word.lemma;
  if (kind === "tf") {
    if (!tfStatement) return "";
    const acc = tfStatement.trim() === word.enDef.trim();
    return acc ? "True" : "False";
  }
  return "";
}

export function gradeStatelessAnswer(
  word: WordEntry | undefined,
  kind: QuizKind,
  selected: string,
  tfStatement?: string,
): boolean {
  if (!word) return false;
  if (kind === "cloze") return selected === word.lemma;
  if (kind === "tf") {
    if (!tfStatement) return false;
    const acc = tfStatement.trim() === word.enDef.trim();
    const expected: "True" | "False" = acc ? "True" : "False";
    return selected === expected;
  }
  return false;
}
