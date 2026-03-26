import { render } from "ink";
import { App } from "./App.js";

export async function launchTUI(onLaunchQuiz: (quizPath: string) => void): Promise<void> {
  const { waitUntilExit } = render(<App onLaunchQuiz={onLaunchQuiz} />);
  await waitUntilExit();
}
