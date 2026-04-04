import { useState, useEffect } from "react";
import type { TrueFalseQuestion } from "../../types/quiz";
import "./TrueFalseInput.css";

interface TrueFalseInputProps {
  question: TrueFalseQuestion;
  submitted: boolean;
  previousAnswer?: boolean;
  onSubmit: (v: boolean) => void;
}

export function TrueFalseInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: TrueFalseInputProps) {
  const [selected, setSelected] = useState<boolean | null>(previousAnswer ?? null);

  useEffect(() => {
    setSelected(previousAnswer ?? null);
  }, [previousAnswer]);

  const btnClass = (val: boolean) => {
    let cls = "btn btn--tf";
    if (submitted) {
      if (val === question.correctAnswer) cls += " btn--tf-correct";
      else if (val === previousAnswer) cls += " btn--tf-wrong";
    } else if (val === selected) {
      cls += " btn--tf-selected";
    }
    return cls;
  };

  return (
    <div>
      <div className="tf-buttons">
        <button
          className={btnClass(true)}
          onClick={() => !submitted && setSelected(true)}
          disabled={submitted}
        >
          True
        </button>
        <button
          className={btnClass(false)}
          onClick={() => !submitted && setSelected(false)}
          disabled={submitted}
        >
          False
        </button>
      </div>
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
