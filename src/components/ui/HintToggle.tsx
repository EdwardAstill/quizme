import { useState } from "react";
import { Markdown } from "./Markdown";
import "./HintToggle.css";

interface HintToggleProps {
  hint: string;
}

export function HintToggle({ hint }: HintToggleProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="hint-area">
      {revealed ? (
        <div className="hint">
          <Markdown>{hint}</Markdown>
        </div>
      ) : (
        <button
          className="hint__btn"
          onClick={() => setRevealed(true)}
        >
          Reveal hint
        </button>
      )}
    </div>
  );
}
