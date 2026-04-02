import { useEffect } from "react";
import { useQuiz } from "./hooks/useQuiz";
import { useSettings } from "./hooks/useSettings";
import type { Quiz } from "./types/quiz";
import { QuizLoader } from "./components/QuizLoader";
import { QuestionCard } from "./components/items/QuestionCard";
import { GroupCard } from "./components/items/GroupCard";
import { InfoPage } from "./components/items/InfoPage";
import { QuizNav } from "./components/QuizNav";
import { ScoreSummary } from "./components/ScoreSummary";
import { Settings } from "./components/Settings";

export default function App() {
  const { settings, update: updateSettings } = useSettings();

  const {
    quiz,
    phase,
    currentIndex,
    currentItem,
    flatItems,
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

  // When served via CLI, quiz data is already parsed and served as JSON
  useEffect(() => {
    fetch("/api/quiz")
      .then((r) => {
        if (!r.ok) throw new Error("No CLI quiz");
        return r.json();
      })
      .then((data) => startQuiz(data as Quiz))
      .catch(() => {
        // Not served via CLI — user will pick a file
      });
  }, [startQuiz]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "active") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
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
          {currentItem.type === "info" && (
            <InfoPage content={currentItem.content} />
          )}
          {currentItem.type === "group" && (
            <GroupCard
              group={currentItem}
              index={currentIndex}
              total={flatItems.length}
              answers={answers}
              onSubmit={submitAnswer}
            />
          )}
          {currentItem.type !== "info" && currentItem.type !== "group" && (
            <div>
              <p className="question-card__counter">
                Question {currentIndex + 1} of {flatItems.length}
              </p>
              <QuestionCard
                question={currentItem}
                answer={answers.get(currentItem.id)}
                onSubmit={submitAnswer}
              />
            </div>
          )}
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
              disabled={currentIndex === flatItems.length - 1}
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
