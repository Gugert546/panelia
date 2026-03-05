import { auth } from "../../lib/firebase/client";

export async function sendMessageToAI(userInput: string) {
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
      body: JSON.stringify({ userInput }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return { output_text: data.output };
  } catch (error) {
    console.error("Error communicating with the backend:", error);
    throw error;
  }
}
