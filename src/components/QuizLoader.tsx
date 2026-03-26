import { useState, useCallback } from "react";
import type { Quiz } from "../types/quiz";
import { parseQuiz } from "../parsers";
import "./QuizLoader.css";

interface QuizLoaderProps {
  onLoad: (quiz: Quiz) => void;
}

export function QuizLoader({ onLoad }: QuizLoaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          onLoad(parseQuiz(content, file.name));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse quiz file.");
        }
      };
      reader.readAsText(file);
    },
    [onLoad]
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="quiz-loader">
      <h1>QuizMe</h1>
      <p className="quiz-loader__subtitle">
        Drop a .quiz or .quiz.md file to get started.
      </p>

      <div
        className={`quiz-loader__dropzone ${dragging ? "quiz-loader__dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="quiz-loader__icon">📄</span>
        <p>Drag &amp; drop your quiz file here</p>
        <span className="quiz-loader__or">or</span>
        <label className="quiz-loader__btn">
          Choose file
          <input
            type="file"
            accept=".quiz,.json,.md"
            onChange={handleFile}
            hidden
          />
        </label>
      </div>

      {error && <p className="quiz-loader__error">{error}</p>}
    </div>
  );
}
