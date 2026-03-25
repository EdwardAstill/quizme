import type { Quiz, ItemStatus } from "../types/quiz";

interface QuizNavProps {
  quiz: Quiz;
  currentIndex: number;
  statuses: ItemStatus[];
  onNavigate: (index: number) => void;
  onFinish: () => void;
  allAnswered: boolean;
}

export function QuizNav({
  quiz,
  currentIndex,
  statuses,
  onNavigate,
  onFinish,
  allAnswered,
}: QuizNavProps) {
  return (
    <nav className="quiz-nav">
      <div className="quiz-nav__header">
        <h2 className="quiz-nav__title">{quiz.title}</h2>
        {quiz.description && (
          <p className="quiz-nav__desc">{quiz.description}</p>
        )}
      </div>

      <ol className="quiz-nav__list">
        {quiz.questions.map((item, i) => {
          const status = statuses[i];
          const isCurrent = i === currentIndex;
          const label = item.type === "group" ? item.question : item.question;
          // Truncate long labels
          const shortLabel =
            label.length > 48 ? label.slice(0, 45) + "..." : label;

          return (
            <li key={item.id}>
              <button
                className={`quiz-nav__item ${isCurrent ? "quiz-nav__item--current" : ""}`}
                onClick={() => onNavigate(i)}
              >
                <span className={`quiz-nav__dot quiz-nav__dot--${status}`} />
                <span className="quiz-nav__num">{i + 1}</span>
                <span className="quiz-nav__label">{shortLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="quiz-nav__footer">
        <button
          className="btn btn--primary quiz-nav__finish"
          onClick={onFinish}
          disabled={!allAnswered}
        >
          {allAnswered ? "Finish quiz" : `${statuses.filter((s) => s === "unanswered" || s === "current").length} remaining`}
        </button>
      </div>
    </nav>
  );
}
