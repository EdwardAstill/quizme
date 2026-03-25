import { useState, useEffect } from "react";
import type { Question, QuizItem, AnswerRecord } from "../types/quiz";
import { Latex } from "./Latex";

interface QuestionCardProps {
  item: QuizItem;
  index: number;
  total: number;
  answers: Map<string, AnswerRecord>;
  onSubmit: (questionId: string, answer: string | string[] | boolean) => void;
}

export function QuestionCard({
  item,
  index,
  total,
  answers,
  onSubmit,
}: QuestionCardProps) {
  if (item.type === "group") {
    return (
      <div className="question-group">
        <p className="question-card__counter">
          Question {index + 1} of {total}
        </p>
        <h2 className="question-group__prompt"><Latex>{item.question}</Latex></h2>
        <div className="question-group__parts">
          {item.parts.map((part, i) => (
            <div key={part.id} className="question-group__part">
              <span className="question-group__part-label">Part {String.fromCharCode(97 + i)}</span>
              <SingleQuestion
                question={part}
                answer={answers.get(part.id)}
                onSubmit={onSubmit}
              />
            </div>
          ))}
        </div>
        {item.explanation && allPartsAnswered(item.parts, answers) && (
          <div className="question-card__feedback question-card__feedback--info">
            <p><Latex>{item.explanation}</Latex></p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="question-card__counter">
        Question {index + 1} of {total}
      </p>
      <SingleQuestion
        question={item}
        answer={answers.get(item.id)}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function allPartsAnswered(parts: Question[], answers: Map<string, AnswerRecord>) {
  return parts.every((p) => answers.has(p.id));
}

/* ---------- Single question renderer ---------- */

function SingleQuestion({
  question,
  answer,
  onSubmit,
}: {
  question: Question;
  answer?: AnswerRecord;
  onSubmit: (questionId: string, ans: string | string[] | boolean) => void;
}) {
  const submitted = !!answer;
  const correct = answer?.correct ?? null;

  return (
    <div className="question-card">
      <h2 className="question-card__text"><Latex>{question.question}</Latex></h2>

      <div className="question-card__body">
        {question.type === "single" && (
          <SingleInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as string | undefined}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}

        {question.type === "multi" && (
          <MultiInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as string[] | undefined}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}

        {question.type === "truefalse" && (
          <TrueFalseInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as boolean | undefined}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}

        {question.type === "freetext" && (
          <FreeTextInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as string | undefined}
            placeholder={question.placeholder}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}
      </div>

      {submitted && (
        <div
          className={`question-card__feedback ${correct ? "question-card__feedback--correct" : "question-card__feedback--wrong"}`}
        >
          <strong>{correct ? "Correct!" : "Incorrect"}</strong>
          {question.explanation && <p><Latex>{question.explanation}</Latex></p>}
          {question.type === "freetext" && !correct && (
            <p>
              Expected: <strong><Latex>{question.answer}</Latex></strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-inputs ---------- */

function SingleInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: {
  question: Question & { type: "single" };
  submitted: boolean;
  previousAnswer?: string;
  onSubmit: (v: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(previousAnswer ?? null);

  useEffect(() => {
    setSelected(previousAnswer ?? null);
  }, [previousAnswer]);

  return (
    <div>
      <ul className="options-list">
        {question.options.map((opt) => {
          let cls = "option";
          if (submitted) {
            if (opt === question.answer) cls += " option--correct";
            else if (opt === previousAnswer) cls += " option--wrong";
          } else if (opt === selected) {
            cls += " option--selected";
          }
          return (
            <li key={opt}>
              <button
                className={cls}
                onClick={() => !submitted && setSelected(opt)}
                disabled={submitted}
              >
                <Latex>{opt}</Latex>
              </button>
            </li>
          );
        })}
      </ul>
      {!submitted && (
        <div className="question-card__actions">
          <button
            className="btn btn--primary"
            onClick={() => selected && onSubmit(selected)}
            disabled={!selected}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

function MultiInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: {
  question: Question & { type: "multi" };
  submitted: boolean;
  previousAnswer?: string[];
  onSubmit: (v: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(previousAnswer ?? []);

  useEffect(() => {
    setSelected(previousAnswer ?? []);
  }, [previousAnswer]);

  const toggle = (opt: string) => {
    if (submitted) return;
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]
    );
  };

  return (
    <div>
      <ul className="options-list">
        {question.options.map((opt) => {
          let cls = "option";
          if (submitted) {
            if (question.answers.includes(opt)) cls += " option--correct";
            else if (selected.includes(opt)) cls += " option--wrong";
          } else if (selected.includes(opt)) {
            cls += " option--selected";
          }
          return (
            <li key={opt}>
              <button className={cls} onClick={() => toggle(opt)} disabled={submitted}>
                <span className={`option__check ${selected.includes(opt) ? "option__check--on" : ""}`} />
                <Latex>{opt}</Latex>
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

function TrueFalseInput({
  question,
  submitted,
  previousAnswer,
  onSubmit,
}: {
  question: Question & { type: "truefalse" };
  submitted: boolean;
  previousAnswer?: boolean;
  onSubmit: (v: boolean) => void;
}) {
  const [selected, setSelected] = useState<boolean | null>(previousAnswer ?? null);

  useEffect(() => {
    setSelected(previousAnswer ?? null);
  }, [previousAnswer]);

  const btnClass = (val: boolean) => {
    let cls = "btn btn--tf";
    if (submitted) {
      if (val === question.answer) cls += " btn--tf-correct";
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

function FreeTextInput({
  submitted,
  previousAnswer,
  placeholder,
  onSubmit,
}: {
  question: Question & { type: "freetext" };
  submitted: boolean;
  previousAnswer?: string;
  placeholder?: string;
  onSubmit: (v: string) => void;
}) {
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
        placeholder={placeholder || "Type your answer..."}
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
