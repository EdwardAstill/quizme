import { useState, useEffect } from "react";
import type { SingleChoiceQuestion } from "../../types/quiz";
import { Markdown } from "../ui/Markdown";
import "./SingleInput.css";

interface SingleInputProps {
  question: SingleChoiceQuestion;
  submitted: boolean;
  previousAnswer?: number;
  onSubmit: (v: number) => void;
}

export function SingleInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: SingleInputProps) {
  const [selected, setSelected] = useState<number | null>(previousAnswer ?? null);

  useEffect(() => {
    setSelected(previousAnswer ?? null);
  }, [previousAnswer]);

  return (
    <div>
      <ul className="options-list">
        {question.options.map((opt, idx) => {
          let cls = "option";
          if (submitted) {
            if (idx === question.correctAnswer) cls += " option--correct";
            else if (idx === previousAnswer) cls += " option--wrong";
          } else if (idx === selected) {
            cls += " option--selected";
          }
          return (
            <li key={idx}>
              <button
                className={cls}
                onClick={() => !submitted && setSelected(idx)}
                disabled={submitted}
              >
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
            onClick={() => selected !== null && onSubmit(selected)}
            disabled={selected === null}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
