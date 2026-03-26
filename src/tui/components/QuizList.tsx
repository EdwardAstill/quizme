import { useState, useMemo } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { StatusBar } from "./StatusBar.js";
import type { QuizFile, FolderInfo, ViewMode } from "../hooks/useQuizFiles.js";

interface QuizListProps {
  viewMode: ViewMode;
  folders: FolderInfo[];
  allQuizzes: QuizFile[];
  onLaunchQuiz: (path: string) => void;
  onEditSpec: (folderName: string) => void;
  onNewSpec: () => void;
  onDelete: (quizPath: string) => void;
  onMove: (quiz: QuizFile) => void;
  onToggleView: () => void;
}

type ListItem =
  | { kind: "folder"; folder: FolderInfo }
  | { kind: "quiz"; quiz: QuizFile };

export function QuizList({
  viewMode,
  folders,
  allQuizzes,
  onLaunchQuiz,
  onEditSpec,
  onNewSpec,
  onDelete,
  onMove,
  onToggleView,
}: QuizListProps) {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const items = useMemo(() => {
    const result: ListItem[] = [];
    for (const folder of folders) {
      result.push({ kind: "folder", folder });
      for (const quiz of allQuizzes.filter((q) => q.folder === folder.name)) {
        result.push({ kind: "quiz", quiz });
      }
    }
    return result;
  }, [folders, allQuizzes]);

  useInput((input, key) => {
    if (confirmDelete) return;

    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor((c) => Math.min(items.length - 1, c + 1));
    } else if (key.return && items.length > 0) {
      const item = items[cursor]!;
      if (item.kind === "quiz") {
        onLaunchQuiz(item.quiz.path);
      } else if (item.kind === "folder") {
        onEditSpec(item.folder.name);
      }
    } else if (input === "d" && items.length > 0) {
      const item = items[cursor]!;
      if (item.kind === "quiz") {
        setConfirmDelete(true);
      }
    } else if (input === "m" && items.length > 0) {
      const item = items[cursor]!;
      if (item.kind === "quiz") {
        onMove(item.quiz);
        setCursor((c) => Math.min(c, items.length - 2));
      }
    } else if (key.tab) {
      setCursor(0);
      onToggleView();
    } else if (input === "n") {
      onNewSpec();
    } else if (input === "q") {
      exit();
    }
  });

  const handleConfirmDelete = () => {
    const item = items[cursor]!;
    if (item.kind === "quiz") {
      onDelete(item.quiz.path);
      setCursor((c) => Math.min(c, items.length - 2));
    }
    setConfirmDelete(false);
  };

  const isEmpty = items.length === 0;
  const moveLabel = viewMode === "local" ? "Move to config" : "Move to local";

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="magenta">QuizMe</Text>
        <Text dimColor> — </Text>
        <Text color={viewMode === "local" ? "green" : "blue"} bold>
          {viewMode === "local" ? "local .quizme/" : "~/.config/quizme/"}
        </Text>
      </Box>

      {isEmpty ? (
        <Box flexDirection="column">
          <Text dimColor>
            {viewMode === "local"
              ? "No quizzes in .quizme/ — run /make-quiz to generate some."
              : "No quizzes saved to config yet. Move quizzes here from local with [m]."}
          </Text>
          <Text dimColor>Press <Text color="cyan" bold>Tab</Text> to switch views, <Text color="cyan" bold>n</Text> to create a quizspec.</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {items.map((item, i) => {
            const selected = i === cursor;
            if (item.kind === "folder") {
              return (
                <Box key={`f-${item.folder.name}`}>
                  <Text color={selected ? "cyan" : "yellow"} bold>
                    {selected ? "❯ " : "  "}
                    {item.folder.label}
                  </Text>
                  <Text dimColor>
                    {" "}({item.folder.quizCount} quiz{item.folder.quizCount !== 1 ? "zes" : ""})
                    {item.folder.hasSpec ? "" : " [no spec]"}
                  </Text>
                </Box>
              );
            }
            return (
              <Box key={`q-${item.quiz.path}`}>
                <Text color={selected ? "cyan" : undefined}>
                  {selected ? "  ❯ " : "    "}
                  {item.quiz.name}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {confirmDelete && items.length > 0 && items[cursor]!.kind === "quiz" && (
        <ConfirmDialog
          message={`Delete '${(items[cursor] as { kind: "quiz"; quiz: QuizFile }).quiz.name}'?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <StatusBar
        keys={[
          { key: "Tab", label: viewMode === "local" ? "Switch to config" : "Switch to local" },
          { key: "Enter", label: "Launch / Edit spec" },
          { key: "m", label: moveLabel },
          { key: "d", label: "Delete" },
          { key: "n", label: "New spec" },
          { key: "q", label: "Quit" },
        ]}
      />
    </Box>
  );
}
