import { useState, useCallback } from "react";
import type { Quiz } from "../types/quiz";

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
          const data = JSON.parse(e.target?.result as string);
          if (!data.title || !Array.isArray(data.questions)) {
            setError("Invalid quiz format: must have 'title' and 'questions'.");
            return;
          }
          onLoad(data as Quiz);
        } catch {
          setError("Failed to parse JSON. Check the file format.");
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
        Drop a quiz JSON file or pick one to get started.
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
            accept=".json"
            onChange={handleFile}
            hidden
          />
        </label>
      </div>

      {error && <p className="quiz-loader__error">{error}</p>}
    </div>
  );
}
