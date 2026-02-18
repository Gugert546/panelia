
// Denne filen er KUN for å teste om World News API-kallet fungerer. 

import { testFetchNews } from "./app/features/Widgets/builtins/NewsWidget/NewsWidget";

async function runTest() {
  console.log("Testing merged NewsWidget API...");

  await testFetchNews("no");
}

runTest();
