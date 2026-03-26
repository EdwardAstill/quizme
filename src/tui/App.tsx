import { useState } from "react";
import { QuizList } from "./components/QuizList.js";
import { QuizspecCreator } from "./components/QuizspecCreator.js";
import { useQuizFiles } from "./hooks/useQuizFiles.js";
import { cwdToFolderName } from "./utils/configDir.js";

type Screen = { kind: "list" } | { kind: "creator"; folderName: string };

interface AppProps {
  onLaunchQuiz: (path: string) => void;
}

export function App({ onLaunchQuiz }: AppProps) {
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const { viewMode, folders, allQuizzes, deleteQuiz, moveToConfig, moveToLocal, toggleViewMode, refresh } = useQuizFiles();

  if (screen.kind === "creator") {
    return (
      <QuizspecCreator
        folderName={screen.folderName}
        onBack={() => {
          refresh();
          setScreen({ kind: "list" });
        }}
      />
    );
  }

  return (
    <QuizList
      viewMode={viewMode}
      folders={folders}
      allQuizzes={allQuizzes}
      onLaunchQuiz={onLaunchQuiz}
      onEditSpec={(folderName) => setScreen({ kind: "creator", folderName })}
      onNewSpec={() => setScreen({ kind: "creator", folderName: cwdToFolderName(process.cwd()) })}
      onDelete={deleteQuiz}
      onMove={(quiz) => {
        if (viewMode === "local") {
          moveToConfig(quiz);
        } else {
          moveToLocal(quiz);
        }
      }}
      onToggleView={toggleViewMode}
    />
  );
}
