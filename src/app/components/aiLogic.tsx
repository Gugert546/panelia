import { auth } from "../../lib/firebase/client";

export type AiToolExecution = {
  name: string;
  result: unknown;
};

export type AiChatHistoryItem = {
  sender: "user" | "ai";
  text: string;
};

export async function sendMessageToAI(
  userInput: string,
  history: AiChatHistoryItem[] = []
) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    const idToken = await currentUser.getIdToken();

    const response = await fetch("https://panelia-server-1044777021142.europe-west1.run.app/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ userInput, history }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      output_text: typeof data.output === "string" ? data.output : "",
      executedTools: Array.isArray(data.executedTools)
        ? (data.executedTools as AiToolExecution[])
        : [],
    };
  } catch (error) {
    console.error("Error communicating with the backend:", error);
    throw error;
  }
}
