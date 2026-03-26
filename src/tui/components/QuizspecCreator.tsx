import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { StatusBar } from "./StatusBar.js";
import { copyToClipboard } from "../hooks/useClipboard.js";
import {
  DEFAULT_QUIZSPEC,
  serializeQuizspec,
  type Quizspec,
  type QuizspecSource,
  type QuizspecParameters,
} from "../utils/quizspec.js";
import { writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_ROOT, ensureConfigDir, folderNameToPath } from "../utils/configDir.js";
import yaml from "js-yaml";

const SOURCE_TYPES: QuizspecSource["type"][] = ["folder", "file", "url", "pdf", "codebase"];
const COUNTS = [5, 10, 15, 20, 25, 30, 50];
const DIFFICULTIES: QuizspecParameters["difficulty"][] = ["beginner", "intermediate", "advanced", "mixed"];
const QUESTION_TYPES = ["single", "multi", "truefalse", "freetext", "group"];

interface Field {
  key: string;
  label: string;
  type: "text" | "cycle" | "toggle" | "multi-toggle";
  options?: string[] | number[];
}

const FIELDS: Field[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "sourceType", label: "Source type", type: "cycle", options: SOURCE_TYPES },
  { key: "sourcePath", label: "Source path/url", type: "text" },
  { key: "count", label: "Count", type: "cycle", options: COUNTS },
  { key: "difficulty", label: "Difficulty", type: "cycle", options: DIFFICULTIES },
  { key: "types", label: "Question types", type: "multi-toggle", options: QUESTION_TYPES },
  { key: "teach", label: "Teach mode", type: "toggle" },
  { key: "sections", label: "Sections", type: "toggle" },
  { key: "hints", label: "Hints", type: "toggle" },
  { key: "focus", label: "Focus topics", type: "text" },
  { key: "exclude", label: "Exclude topics", type: "text" },
  { key: "notes", label: "Notes", type: "text" },
];

interface QuizspecCreatorProps {
  folderName: string;
  onBack: () => void;
}

interface FormState {
  title: string;
  description: string;
  sourceType: number;
  sourcePath: string;
  count: number;
  difficulty: number;
  types: boolean[];
  teach: boolean;
  sections: boolean;
  hints: boolean;
  focus: string;
  exclude: string;
  notes: string;
}

function buildQuizspec(state: FormState): Quizspec {
  const sourceType = SOURCE_TYPES[state.sourceType]!;
  const source: QuizspecSource = { type: sourceType };
  if (sourceType === "url") {
    source.url = state.sourcePath || undefined;
  } else {
    source.path = state.sourcePath || undefined;
  }

  const enabledTypes = QUESTION_TYPES.filter((_, i) => state.types[i]);

  return {
    title: state.title || DEFAULT_QUIZSPEC.title,
    description: state.description,
    sources: [source],
    parameters: {
      count: COUNTS[state.count]!,
      difficulty: DIFFICULTIES[state.difficulty]!,
      types: enabledTypes.length > 0 ? enabledTypes : DEFAULT_QUIZSPEC.parameters.types,
      teach: state.teach,
      sections: state.sections,
      hints: state.hints,
    },
    focus: state.focus ? state.focus.split(",").map((s) => s.trim()).filter(Boolean) : [],
    exclude: state.exclude ? state.exclude.split(",").map((s) => s.trim()).filter(Boolean) : [],
    notes: state.notes,
  };
}

function loadExistingSpec(folderName: string): FormState | null {
  const folderPath = join(CONFIG_ROOT, folderName);
  try {
    const files = existsSync(folderPath)
      ? readdirSync(folderPath).filter((f) => f.endsWith(".quizspec"))
      : [];
    if (files.length === 0) return null;
    const content = readFileSync(join(folderPath, files[0]), "utf-8");
    const spec = yaml.load(content) as Record<string, unknown>;
    const params = (spec.parameters ?? {}) as Record<string, unknown>;
    const sources = (spec.sources ?? []) as Record<string, unknown>[];
    const source = sources[0] ?? {};
    const sourceTypeStr = ((source.type as string) ?? "folder") as QuizspecSource["type"];
    const sourceType = SOURCE_TYPES.indexOf(sourceTypeStr);
    const types = (params.types as string[]) ?? QUESTION_TYPES;
    const difficultyStr = ((params.difficulty as string) ?? "mixed") as QuizspecParameters["difficulty"];

    return {
      title: (spec.title as string) ?? "",
      description: (spec.description as string) ?? "",
      sourceType: sourceType >= 0 ? sourceType : 0,
      sourcePath: ((source.path ?? source.url) as string) ?? "",
      count: COUNTS.indexOf((params.count as number) ?? 15),
      difficulty: DIFFICULTIES.indexOf(difficultyStr),
      types: QUESTION_TYPES.map((t) => types.includes(t)),
      teach: (params.teach as boolean) ?? false,
      sections: (params.sections as boolean) ?? true,
      hints: (params.hints as boolean) ?? false,
      focus: ((spec.focus as string[]) ?? []).join(", "),
      exclude: ((spec.exclude as string[]) ?? []).join(", "),
      notes: (spec.notes as string) ?? "",
    };
  } catch {
    return null;
  }
}

export function QuizspecCreator({ folderName, onBack }: QuizspecCreatorProps) {
  const folderLabel = folderNameToPath(folderName).replace(/^\/home\/[^/]+\//, "~/");
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("");
  const [editingText, setEditingText] = useState(false);
  const [multiToggleCursor, setMultiToggleCursor] = useState(0);

  const [form, setForm] = useState<FormState>(() => {
    return loadExistingSpec(folderName) ?? {
      title: "",
      description: "",
      sourceType: 0,
      sourcePath: "",
      count: 2, // index into COUNTS → 15
      difficulty: 3, // index into DIFFICULTIES → mixed
      types: [true, true, true, true, true],
      teach: false,
      sections: true,
      hints: false,
      focus: "",
      exclude: "",
      notes: "",
    };
  });

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  }, []);

  const currentField = FIELDS[cursor]!;

  const getTextValue = (key: string): string => {
    return form[key as keyof FormState] as string;
  };

  const setTextValue = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  useInput((input, key) => {
    if (editingText) {
      if (key.return || key.escape) {
        setEditingText(false);
      }
      return;
    }

    if (key.escape) {
      onBack();
      return;
    }

    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      setMultiToggleCursor(0);
    } else if (key.downArrow) {
      setCursor((c) => Math.min(FIELDS.length - 1, c + 1));
      setMultiToggleCursor(0);
    } else if (currentField.type === "text" && key.return) {
      setEditingText(true);
    } else if (currentField.type === "cycle" && (key.leftArrow || key.rightArrow)) {
      const opts = currentField.options!;
      const stateKey = currentField.key as "sourceType" | "count" | "difficulty";
      const current = form[stateKey] as number;
      const next = key.rightArrow
        ? (current + 1) % opts.length
        : (current - 1 + opts.length) % opts.length;
      setForm((f) => ({ ...f, [stateKey]: next }));
    } else if (currentField.type === "toggle" && (key.leftArrow || key.rightArrow)) {
      const stateKey = currentField.key as "teach" | "sections" | "hints";
      setForm((f) => ({ ...f, [stateKey]: !f[stateKey] }));
    } else if (currentField.type === "multi-toggle") {
      if (key.leftArrow) {
        setMultiToggleCursor((c) => Math.max(0, c - 1));
      } else if (key.rightArrow) {
        setMultiToggleCursor((c) => Math.min(QUESTION_TYPES.length - 1, c + 1));
      } else if (input === " ") {
        setForm((f) => {
          const newTypes = [...f.types];
          newTypes[multiToggleCursor] = !newTypes[multiToggleCursor];
          return { ...f, types: newTypes };
        });
      }
    } else if (input === "c") {
      const yamlStr = serializeQuizspec(buildQuizspec(form));
      copyToClipboard(yamlStr).then((ok) => {
        showMessage(ok ? "Copied to clipboard!" : "Failed to copy — is xclip/wl-copy installed?");
      });
    } else if (input === "p") {
      const spec = buildQuizspec(form);
      const yamlStr = serializeQuizspec(spec);
      const dir = ensureConfigDir(folderNameToPath(folderName));
      const filename = folderName + ".quizspec";
      writeFileSync(join(dir, filename), yamlStr);
      showMessage(`Saved ${filename}`);
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="magenta">Quizspec</Text>
        <Text dimColor> — {folderLabel}</Text>
      </Box>

      {FIELDS.map((field, i) => {
        const selected = i === cursor;
        const prefix = selected ? "❯ " : "  ";

        return (
          <Box key={field.key}>
            <Text color={selected ? "cyan" : "white"}>
              {prefix}
              <Text bold>{field.label}: </Text>
            </Text>
            {field.type === "text" && selected && editingText ? (
              <TextInput
                value={getTextValue(field.key)}
                onChange={(v) => setTextValue(field.key, v)}
                focus={true}
              />
            ) : field.type === "text" ? (
              <Text dimColor={!getTextValue(field.key)}>
                {getTextValue(field.key) || (selected ? "[Enter to edit]" : "—")}
              </Text>
            ) : field.type === "cycle" ? (
              <Box>
                {selected && <Text dimColor>◀ </Text>}
                <Text color={selected ? "yellow" : undefined}>
                  {field.options![form[field.key as keyof FormState] as number]}
                </Text>
                {selected && <Text dimColor> ▶</Text>}
              </Box>
            ) : field.type === "toggle" ? (
              <Box>
                {selected && <Text dimColor>◀ </Text>}
                <Text color={form[field.key as keyof FormState] ? "green" : "red"}>
                  {form[field.key as keyof FormState] ? "on" : "off"}
                </Text>
                {selected && <Text dimColor> ▶</Text>}
              </Box>
            ) : field.type === "multi-toggle" ? (
              <Box gap={1}>
                {QUESTION_TYPES.map((t, ti) => {
                  const enabled = form.types[ti];
                  const focused = selected && ti === multiToggleCursor;
                  return (
                    <Text
                      key={t}
                      color={enabled ? "green" : "red"}
                      underline={focused}
                      bold={focused}
                    >
                      {t}
                    </Text>
                  );
                })}
              </Box>
            ) : null}
          </Box>
        );
      })}

      <StatusBar
        keys={[
          { key: "↑↓", label: "Navigate" },
          { key: "◀▶", label: "Change" },
          { key: "c", label: "Copy YAML" },
          { key: "p", label: "Save file" },
          { key: "Esc", label: "Back" },
        ]}
        message={message}
      />
    </Box>
  );
}
