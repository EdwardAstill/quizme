import type { QuestionGroup, Question, AnswerRecord } from "../../types/quiz";
import { Markdown } from "../ui/Markdown";
import { HintToggle } from "../ui/HintToggle";
import { QuestionCard } from "./QuestionCard";
import "./GroupCard.css";

interface GroupCardProps {
  group: QuestionGroup;
  index: number;
  total: number;
  answers: Map<string, AnswerRecord>;
  onSubmit: (questionId: string, ans: number | number[] | boolean | string) => void;
}

function allPartsAnswered(parts: Question[], answers: Map<string, AnswerRecord>) {
  return parts.every((p) => answers.has(p.id));
}

export function GroupCard({ group, index, total, answers, onSubmit }: GroupCardProps) {
  return (
    <div className="question-group">
      <p className="question-card__counter">
        Question {index + 1} of {total}
      </p>
      <div className="question-group__prompt">
        <Markdown>{group.question}</Markdown>
      </div>
      {group.hint && !allPartsAnswered(group.parts, answers) && (
        <HintToggle hint={group.hint} />
      )}
      <div className="question-group__parts">
        {group.parts.map((part, i) => (
          <div key={part.id} className="question-group__part">
            <span className="question-group__part-label">
              Part {String.fromCharCode(97 + i)}
            </span>
            <QuestionCard
              question={part}
              answer={answers.get(part.id)}
              onSubmit={onSubmit}
            />
          </div>
        ))}
      </div>
      {group.explanation && allPartsAnswered(group.parts, answers) && (
        <div className="question-card__feedback question-card__feedback--info">
          <Markdown>{group.explanation}</Markdown>
        </div>
      )}
    </div>
  );
}
