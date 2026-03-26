import yaml from "js-yaml";

export interface QuizspecSource {
  type: "folder" | "file" | "url" | "pdf" | "codebase";
  path?: string;
  url?: string;
  glob?: string;
  pages?: string;
}

export interface QuizspecParameters {
  count: number;
  difficulty: "beginner" | "intermediate" | "advanced" | "mixed";
  types: string[];
  teach: boolean;
  sections: boolean;
  hints: boolean;
}

export interface Quizspec {
  title: string;
  description: string;
  sources: QuizspecSource[];
  parameters: QuizspecParameters;
  focus: string[];
  exclude: string[];
  notes: string;
}

export const DEFAULT_QUIZSPEC: Quizspec = {
  title: "",
  description: "",
  sources: [{ type: "folder" }],
  parameters: {
    count: 15,
    difficulty: "mixed",
    types: ["single", "multi", "truefalse", "freetext", "group"],
    teach: false,
    sections: true,
    hints: false,
  },
  focus: [],
  exclude: [],
  notes: "",
};

export function serializeQuizspec(spec: Quizspec): string {
  const output: Record<string, unknown> = {
    title: spec.title || "Untitled Quiz",
  };

  if (spec.description) output.description = spec.description;

  const sources = spec.sources.map((s) => {
    const src: Record<string, unknown> = { type: s.type };
    if (s.type === "url") {
      if (s.url) src.url = s.url;
    } else {
      if (s.path) src.path = s.path;
    }
    if (s.glob) src.glob = s.glob;
    if (s.pages) src.pages = s.pages;
    return src;
  });
  output.sources = sources;

  output.parameters = {
    count: spec.parameters.count,
    difficulty: spec.parameters.difficulty,
    types: spec.parameters.types,
    teach: spec.parameters.teach,
    sections: spec.parameters.sections,
    hints: spec.parameters.hints,
  };

  if (spec.focus.length > 0) output.focus = spec.focus;
  if (spec.exclude.length > 0) output.exclude = spec.exclude;
  if (spec.notes) output.notes = spec.notes;

  return yaml.dump(output, { lineWidth: -1, quotingType: '"' });
}
