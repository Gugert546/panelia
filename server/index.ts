import express from "express";
import cors from "cors";
import { weatherRouter } from "./weatherRouter";

const app = express();

app.use(cors());
app.use(express.json());

// Mount på /api/weather
app.use("/api/weather", weatherRouter);

// Enkel test
app.get("/health", (_, res) => res.send("OK"));

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
  console.log(`Weather endpoint: http://localhost:${PORT}/api/weather?lat=59.91&lon=10.75`);
});