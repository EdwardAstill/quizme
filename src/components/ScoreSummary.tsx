import type { Quiz, AnswerRecord } from "../types/quiz";

interface ScoreSummaryProps {
  quiz: Quiz;
  answers: AnswerRecord[];
  score: number;
  onRestart: () => void;
  onNewQuiz: () => void;
}

export function ScoreSummary({
  quiz,
  answers,
  score,
  onRestart,
  onNewQuiz,
}: ScoreSummaryProps) {
  const total = quiz.questions.length;
  const pct = Math.round((score / total) * 100);

  return (
    <div className="score-summary">
      <h1>Results</h1>
      <div className="score-summary__hero">
        <span className="score-summary__pct">{pct}%</span>
        <span className="score-summary__fraction">
          {score} / {total} correct
        </span>
      </div>

      <div className="score-summary__breakdown">
        <h2>Question breakdown</h2>
        <ul>
          {quiz.questions.map((q, i) => {
            const record = answers[i];
            return (
              <li key={q.id} className={`breakdown-item ${record?.correct ? "breakdown-item--correct" : "breakdown-item--wrong"}`}>
                <span className="breakdown-item__icon">
                  {record?.correct ? "\u2705" : "\u274C"}
                </span>
                <div className="breakdown-item__content">
                  <p className="breakdown-item__question">{q.question}</p>
                  {q.explanation && (
                    <p className="breakdown-item__explanation">
                      {q.explanation}
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
