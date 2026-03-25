import { useEffect } from "react";
import { useQuiz } from "./hooks/useQuiz";
import { QuizLoader } from "./components/QuizLoader";
import { QuestionCard } from "./components/QuestionCard";
import { ProgressBar } from "./components/ProgressBar";
import { ScoreSummary } from "./components/ScoreSummary";
import type { Quiz } from "./types/quiz";

export default function App() {
  const {
    quiz,
    phase,
    currentIndex,
    currentQuestion,
    answers,
    score,
    total,
    startQuiz,
    submitAnswer,
    nextQuestion,
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

  if (phase === "loading") {
    return <QuizLoader onLoad={startQuiz} />;
  }

  if (phase === "finished" && quiz) {
    return (
      <ScoreSummary
        quiz={quiz}
        answers={answers}
        score={score}
        onRestart={restart}
        onNewQuiz={reset}
      />
    );
  }

  if (phase === "active" && currentQuestion && quiz) {
    return (
      <div className="quiz-container">
        <h1 className="quiz-title">{quiz.title}</h1>
        <ProgressBar current={currentIndex + 1} total={total} />
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          index={currentIndex}
          total={total}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
        />
      </div>
    );
  }

  return null;
}
