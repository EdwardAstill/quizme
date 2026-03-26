import type { Quiz, Question, AnswerRecord } from "../types/quiz";
import { Markdown } from "./Markdown";

interface ScoreSummaryProps {
  quiz: Quiz;
  answers: Map<string, AnswerRecord>;
  allQuestions: Question[];
  score: number;
  total: number;
  onRestart: () => void;
  onNewQuiz: () => void;
}

export function ScoreSummary({
  quiz,
  answers,
  allQuestions,
  score,
  total,
  onRestart,
  onNewQuiz,
}: ScoreSummaryProps) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="score-summary">
      <h1>{quiz.title}</h1>
      <div className="score-summary__hero">
        <span className="score-summary__pct">{pct}%</span>
        <span className="score-summary__fraction">
          {score} / {total} correct
        </span>
      </div>

      <div className="score-summary__breakdown">
        <h2>Question breakdown</h2>
        <ul>
          {allQuestions.map((q) => {
            const record = answers.get(q.id);
            const isCorrect = record?.correct ?? false;
            const wasAnswered = !!record;
            return (
              <li
                key={q.id}
                className={`breakdown-item ${wasAnswered ? (isCorrect ? "breakdown-item--correct" : "breakdown-item--wrong") : ""}`}
              >
                <span className="breakdown-item__icon">
                  {!wasAnswered ? "\u2B55" : isCorrect ? "\u2705" : "\u274C"}
                </span>
                <div className="breakdown-item__content">
                  <p className="breakdown-item__question"><Markdown inline>{q.question}</Markdown></p>
                  {q.explanation && (
                    <p className="breakdown-item__explanation">
                      <Markdown inline>{q.explanation}</Markdown>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="score-summary__actions">
        <button className="btn btn--primary" onClick={onRestart}>
          Retry quiz
        </button>
        <button className="btn btn--secondary" onClick={onNewQuiz}>
          Load new quiz
        </button>
      </div>
    </div>
  );
}
