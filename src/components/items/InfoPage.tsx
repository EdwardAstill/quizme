import { Markdown } from "../ui/Markdown";
import "./InfoPage.css";

interface InfoPageProps {
  content: string;
}

export function InfoPage({ content }: InfoPageProps) {
  return (
    <div className="question-card info-page">
      <div className="info-page__content">
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}
