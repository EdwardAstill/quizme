import { useState, useEffect } from "react";
import type { MultiChoiceQuestion } from "../../types/quiz";
import { Markdown } from "../ui/Markdown";
import "./MultiInput.css";

interface MultiInputProps {
  question: MultiChoiceQuestion;
  submitted: boolean;
  previousAnswer?: number[];
  onSubmit: (v: number[]) => void;
}

export function MultiInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: MultiInputProps) {
  const [selected, setSelected] = useState<number[]>(previousAnswer ?? []);

  useEffect(() => {
    setSelected(previousAnswer ?? []);
  }, [previousAnswer]);

  const toggle = (idx: number) => {
    if (submitted) return;
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((s) => s !== idx) : [...prev, idx]
    );
  };

  return (
    <div>
      <ul className="options-list">
        {question.options.map((opt, idx) => {
          let cls = "option";
          if (submitted) {
            if (question.correctAnswers.includes(idx)) cls += " option--correct";
            else if (selected.includes(idx)) cls += " option--wrong";
          } else if (selected.includes(idx)) {
            cls += " option--selected";
          }
          return (
            <li key={idx}>
              <button className={cls} onClick={() => toggle(idx)} disabled={submitted}>
                <span className={`option__check ${selected.includes(idx) ? "option__check--on" : ""}`} />
                <Markdown inline>{opt}</Markdown>
              </button>
            </li>
          );
        })}
      </ul>
      {!submitted && (
        <div className="question-card__actions">
          <button
            className="btn btn--primary"
            onClick={() => onSubmit(selected)}
            disabled={selected.length === 0}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
