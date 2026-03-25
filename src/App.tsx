import { useEffect } from "react";
import { useQuiz } from "./hooks/useQuiz";
import { QuizLoader } from "./components/QuizLoader";
import { QuestionCard } from "./components/QuestionCard";
import { QuizNav } from "./components/QuizNav";
import { ScoreSummary } from "./components/ScoreSummary";
import type { Quiz } from "./types/quiz";

export default function App() {
  const {
    quiz,
    phase,
    currentIndex,
    currentItem,
    answers,
    score,
    totalQuestions,
    allQuestions,
    itemStatuses,
    allAnswered,
    startQuiz,
    submitAnswer,
    goTo,
    nextQuestion,
    prevQuestion,
    finish,
    restart,
    reset,
  } = useQuiz();

  // When served via CLI, quiz data is available at /api/quiz
  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => {
        if (!r.ok) throw new Error("No CLI quiz");
        return r.json();
      })
      .then((data: Quiz) => startQuiz(data))
      .catch(() => {
        // Not served via CLI — user will pick a file
      });
  }, [startQuiz]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "active") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextQuestion();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevQuestion();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, nextQuestion, prevQuestion]);

  if (phase === "loading") {
    return <QuizLoader onLoad={startQuiz} />;
  }

  if (phase === "finished" && quiz) {
    return (
      <ScoreSummary
        quiz={quiz}
        answers={answers}
        allQuestions={allQuestions}
        score={score}
        total={totalQuestions}
        onRestart={restart}
        onNewQuiz={reset}
      />
    );
  }

  if (phase === "active" && currentItem && quiz) {
    return (
      <div className="quiz-layout">
        <QuizNav
          quiz={quiz}
          currentIndex={currentIndex}
          statuses={itemStatuses}
          onNavigate={goTo}
          onFinish={finish}
          allAnswered={allAnswered}
        />
        <main className="quiz-main">
          <QuestionCard
            key={currentItem.id}
            item={currentItem}
            index={currentIndex}
            total={quiz.questions.length}
            answers={answers}
            onSubmit={submitAnswer}
          />
          <div className="quiz-main__nav">
            <button
              className="btn btn--secondary"
              onClick={prevQuestion}
              disabled={currentIndex === 0}
            >
              Previous
            </button>
            <button
              className="btn btn--secondary"
              onClick={nextQuestion}
              disabled={currentIndex === quiz.questions.length - 1}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
