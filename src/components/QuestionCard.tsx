import { useState } from "react";
import type { Question } from "../types/quiz";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  onSubmit: (answer: string | string[] | boolean) => void;
  onNext: () => void;
}

export function QuestionCard({
  question,
  index,
  total,
  onSubmit,
  onNext,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | string[] | boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    const isCorrect = checkLocally(question, selected);
    setCorrect(isCorrect);
    onSubmit(selected);
  };

  const handleNext = () => {
    setSelected(null);
    setSubmitted(false);
    setCorrect(null);
    onNext();
  };

  return (
    <div className="question-card">
      <p className="question-card__counter">
        Question {index + 1} of {total}
      </p>
      <h2 className="question-card__text">{question.question}</h2>

      <div className="question-card__body">
        {question.type === "single" && (
          <SingleInput
            options={question.options}
            selected={selected as string | null}
            onChange={setSelected}
            disabled={submitted}
            correctAnswer={submitted ? question.answer : undefined}
          />
        )}

        {question.type === "multi" && (
          <MultiInput
            options={question.options}
            selected={(selected as string[]) ?? []}
            onChange={setSelected}
            disabled={submitted}
            correctAnswers={submitted ? question.answers : undefined}
          />
        )}

        {question.type === "truefalse" && (
          <TrueFalseInput
            selected={selected as boolean | null}
            onChange={setSelected}
            disabled={submitted}
            correctAnswer={submitted ? question.answer : undefined}
          />
        )}

        {question.type === "freetext" && (
          <FreeTextInput
            value={(selected as string) ?? ""}
            onChange={(v) => setSelected(v)}
            disabled={submitted}
          />
        )}
      </div>

      {submitted && (
        <div className={`question-card__feedback ${correct ? "question-card__feedback--correct" : "question-card__feedback--wrong"}`}>
          <strong>{correct ? "Correct!" : "Incorrect"}</strong>
          {question.explanation && <p>{question.explanation}</p>}
          {question.type === "freetext" && !correct && (
            <p>
              Expected: <strong>{question.answer}</strong>
            </p>
          )}
        </div>
      )}

      <div className="question-card__actions">
        {!submitted ? (
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={selected === null || (typeof selected === "string" && selected.trim() === "") || (Array.isArray(selected) && selected.length === 0)}
          >
            Submit
          </button>
        ) : (
          <button className="btn btn--primary" onClick={handleNext}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-inputs ---------- */

function SingleInput({
  options,
  selected,
  onChange,
  disabled,
  correctAnswer,
}: {
  options: string[];
  selected: string | null;
  onChange: (v: string) => void;
  disabled: boolean;
  correctAnswer?: string;
}) {
  return (
    <ul className="options-list">
      {options.map((opt) => {
        let cls = "option";
        if (disabled && correctAnswer !== undefined) {
          if (opt === correctAnswer) cls += " option--correct";
          else if (opt === selected) cls += " option--wrong";
        }
        return (
          <li key={opt}>
            <label className={cls}>
              <input
                type="radio"
                name="single"
                value={opt}
                checked={selected === opt}
                onChange={() => onChange(opt)}
                disabled={disabled}
              />
              {opt}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function MultiInput({
  options,
  selected,
  onChange,
  disabled,
  correctAnswers,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
  correctAnswers?: string[];
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <ul className="options-list">
      {options.map((opt) => {
        let cls = "option";
        if (disabled && correctAnswers) {
          if (correctAnswers.includes(opt)) cls += " option--correct";
          else if (selected.includes(opt)) cls += " option--wrong";
        }
        return (
          <li key={opt}>
            <label className={cls}>
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                disabled={disabled}
              />
              {opt}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function TrueFalseInput({
  selected,
  onChange,
  disabled,
  correctAnswer,
}: {
  selected: boolean | null;
  onChange: (v: boolean) => void;
  disabled: boolean;
  correctAnswer?: boolean;
}) {
  const btnClass = (val: boolean) => {
    let cls = "btn btn--tf";
    if (selected === val) cls += " btn--tf-selected";
    if (disabled && correctAnswer !== undefined) {
      if (val === correctAnswer) cls += " btn--tf-correct";
      else if (val === selected) cls += " btn--tf-wrong";
    }
    return cls;
  };

  return (
    <div className="tf-buttons">
      <button className={btnClass(true)} onClick={() => onChange(true)} disabled={disabled}>
        True
      </button>
      <button className={btnClass(false)} onClick={() => onChange(false)} disabled={disabled}>
        False
      </button>
    </div>
  );
}

function FreeTextInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      className="freetext-input"
      type="text"
      placeholder="Type your answer..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

/* ---------- Local check (mirrors useQuiz) ---------- */

function checkLocally(
  question: Question,
  userAnswer: string | string[] | boolean
): boolean {
  switch (question.type) {
    case "single":
      return question.answer === userAnswer;
    case "multi": {
      if (!Array.isArray(userAnswer)) return false;
      const s = [...userAnswer].sort();
      const e = [...question.answers].sort();
      return s.length === e.length && s.every((v, i) => v === e[i]);
    }
    case "truefalse":
      return question.answer === userAnswer;
    case "freetext": {
      if (typeof userAnswer !== "string") return false;
      const a = question.caseSensitive ? userAnswer.trim() : userAnswer.trim().toLowerCase();
      const b = question.caseSensitive ? question.answer.trim() : question.answer.trim().toLowerCase();
      return a === b;
    }
  }
}
