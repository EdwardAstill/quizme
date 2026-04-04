import type { Question, AnswerRecord, SubmitAnswer } from "../../types/quiz";
import { Markdown } from "../ui/Markdown";
import { HintToggle } from "../ui/HintToggle";
import { SingleInput } from "../inputs/SingleInput";
import { MultiInput } from "../inputs/MultiInput";
import { TrueFalseInput } from "../inputs/TrueFalseInput";
import { FreeTextInput } from "../inputs/FreeTextInput";
import "./QuestionCard.css";

interface QuestionCardProps {
  question: Question;
  answer?: AnswerRecord;
  onSubmit: SubmitAnswer;
}

export function QuestionCard({ question, answer, onSubmit }: QuestionCardProps) {
  const submitted = !!answer;
  const correct = answer?.correct ?? null;

  return (
    <div className="question-card">
      <h2 className="question-card__text">
        <Markdown inline>{question.question}</Markdown>
      </h2>

      {question.hint && !submitted && (
        <HintToggle hint={question.hint} />
      )}

      <div className="question-card__body">
        {question.type === "single" && (
          <SingleInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as number | undefined}
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}
        {question.type === "multi" && (
          <MultiInput
            question={question}
            submitted={submitted}
            previousAnswer={answer?.userAnswer as number[] | undefined}
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
            onSubmit={(val) => onSubmit(question.id, val)}
          />
        )}
      </div>

      {submitted && (
        <div
          className={`question-card__feedback ${correct ? "question-card__feedback--correct" : "question-card__feedback--wrong"}`}
        >
          <strong>{correct ? "Correct!" : "Incorrect"}</strong>
          {question.explanation && <Markdown>{question.explanation}</Markdown>}
          {question.type === "freetext" && !correct && (
            <p>
              Expected: <strong><Markdown inline>{question.correctAnswer}</Markdown></strong>
            </p>
          )}
          {question.type === "single" && !correct && (
            <p>
              Expected: <strong><Markdown inline>{question.options[question.correctAnswer]}</Markdown></strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
