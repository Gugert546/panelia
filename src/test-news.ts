
// Denne filen er KUN for å teste om World News API-kallet fungerer. 

import { fetchTopNewsByCountry } from "./app/features/Widgets/components/News/news-api";

async function testNews() {
  try {
    console.log("sTesting news API...");

    const result = await fetchTopNewsByCountry("no");

    console.log("✅ Result:", result);

  } catch (err) {
    console.error("Error:", err);
  }
}

testNews();
