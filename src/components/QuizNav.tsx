import type { Quiz, QuizItem, Section, ItemStatus } from "../types/quiz";
import "./QuizNav.css";

interface QuizNavProps {
  quiz: Quiz;
  currentIndex: number;
  statuses: ItemStatus[];
  onNavigate: (index: number) => void;
  onFinish: () => void;
  allAnswered: boolean;
}

type NavEntry = { item: QuizItem; flatIndex: number };
type NavGroup = { section: Section | null; entries: NavEntry[] };

function buildNavModel(quiz: Quiz): NavGroup[] {
  const groups: NavGroup[] = [];
  let flatIndex = 0;
  for (const item of quiz.questions) {
    if (item.type === "section") {
      const entries = item.items.map((child) => ({ item: child, flatIndex: flatIndex++ }));
      groups.push({ section: item, entries });
    } else {
      groups.push({ section: null, entries: [{ item, flatIndex: flatIndex++ }] });
    }
  }
  return groups;
}

export function QuizNav({
  quiz,
  currentIndex,
  statuses,
  onNavigate,
  onFinish,
  allAnswered,
}: QuizNavProps) {
  const navModel = buildNavModel(quiz);
  const remaining = statuses.filter((s, i) => {
    // Count unanswered/current non-info items
    const item = navModel.flatMap((g) => g.entries).find((e) => e.flatIndex === i);
    return (s === "unanswered" || s === "current") && item?.item.type !== "info";
  }).length;

  return (
    <nav className="quiz-nav">
      <div className="quiz-nav__header">
        <h2 className="quiz-nav__title">{quiz.title}</h2>
        {quiz.description && (
          <p className="quiz-nav__desc">{quiz.description}</p>
        )}
      </div>

      <ol className="quiz-nav__list">
        {navModel.map((group, gi) => (
          <li key={group.section?.id ?? `group-${gi}`} className="quiz-nav__group">
            {group.section && (
              <div className="quiz-nav__section-title">{group.section.title}</div>
            )}
            {group.entries.map((entry) => {
              const status = statuses[entry.flatIndex];
              const isCurrent = entry.flatIndex === currentIndex;
              const label = entry.item.type === "info" ? "Info" : entry.item.question;
              const shortLabel = label.length > 48 ? label.slice(0, 45) + "..." : label;

              return (
                <button
                  key={entry.item.id}
                  className={`quiz-nav__item ${isCurrent ? "quiz-nav__item--current" : ""}`}
                  onClick={() => onNavigate(entry.flatIndex)}
                >
                  <span className={`quiz-nav__dot quiz-nav__dot--${status}`} />
                  <span className="quiz-nav__num">{entry.flatIndex + 1}</span>
                  <span className="quiz-nav__label">{shortLabel}</span>
                </button>
              );
            })}
          </li>
        ))}
      </ol>

      <div className="quiz-nav__footer">
        <button
          className="btn btn--primary quiz-nav__finish"
          onClick={onFinish}
          disabled={!allAnswered}
        >
          {allAnswered ? "Finish quiz" : `${remaining} remaining`}
        </button>
      </div>
    </nav>
  );
}
