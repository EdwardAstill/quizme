import { useState, useEffect } from "react";
import type { FreeTextQuestion } from "../../types/quiz";
import "./FreeTextInput.css";

interface FreeTextInputProps {
  question: FreeTextQuestion;
  submitted: boolean;
  previousAnswer?: string;
  onSubmit: (v: string) => void;
}

export function FreeTextInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: FreeTextInputProps) {
  const [value, setValue] = useState(previousAnswer ?? "");

  useEffect(() => {
    setValue(previousAnswer ?? "");
  }, [previousAnswer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim() && !submitted) {
      onSubmit(value);
    }
  };

  return (
    <div>
      <input
        className="freetext-input"
        type="text"
        placeholder={question.placeholder || "Type your answer..."}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitted}
      />
      {!submitted && (
        <div className="question-card__actions">
          <button
            className="btn btn--primary"
            onClick={() => onSubmit(value)}
            disabled={!value.trim()}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
