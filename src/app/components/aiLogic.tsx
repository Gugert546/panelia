export async function sendMessageToAI(userInput: string) {
  try {
    const response = await fetch("http://localhost:3001/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userInput }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return { output_text: data.output }; // Ensure this matches the backend's response structure
  } catch (error) {
    console.error("Error communicating with the backend:", error);
    throw error;
  }
}

//https://panelia-server-1044777021142.us-central1.run.app