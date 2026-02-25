import OpenAI from "openai";
import dotenv from "dotenv";


//eksempel på tilkobling til chatgpt

dotenv.config();


const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


// SystemPromt= "you are an AI assistant for a personal dashboard website"

const response = await client.responses.create({
    model: "gpt-5.2",// velg riktig model fra prislista
    input: "Write a one-sentence bedtime story about a unicorn." //userinput, skal komme fra chatUI.tsx
});

console.log(response.output_text);