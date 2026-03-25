import { useEffect } from "react";
import { useQuiz } from "./hooks/useQuiz";
import { useSettings } from "./hooks/useSettings";
import { QuizLoader } from "./components/QuizLoader";
import { QuestionCard } from "./components/QuestionCard";
import { QuizNav } from "./components/QuizNav";
import { ScoreSummary } from "./components/ScoreSummary";
import { Settings } from "./components/Settings";
import type { Quiz } from "./types/quiz";

export default function App() {
  const { settings, update: updateSettings } = useSettings();

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

  const settingsBtn = (
    <Settings settings={settings} onUpdate={updateSettings} />
  );

  if (phase === "loading") {
    return (
      <>
        {settingsBtn}
        <QuizLoader onLoad={startQuiz} />
      </>
    );
  }

  if (phase === "finished" && quiz) {
    return (
      <>
      {settingsBtn}
      <ScoreSummary
        quiz={quiz}
        answers={answers}
        allQuestions={allQuestions}
        score={score}
        total={totalQuestions}
        onRestart={restart}
        onNewQuiz={reset}
      />
      </>
    );
  }

  if (phase === "active" && currentItem && quiz) {
    return (
      <div className={`quiz-layout ${!settings.showSidebar ? "quiz-layout--no-sidebar" : ""}`}>
        {settingsBtn}
        {settings.showSidebar && <QuizNav
          quiz={quiz}
          currentIndex={currentIndex}
          statuses={itemStatuses}
          onNavigate={goTo}
          onFinish={finish}
          allAnswered={allAnswered}
        />}
        <main className="quiz-main" style={{ maxWidth: `${settings.contentWidth}%` }}>
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
