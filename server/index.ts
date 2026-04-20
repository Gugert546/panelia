import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { weatherRouter } from "./weatherRouter";
import { newsRouter } from "./newsRouter";
import { aiRouter } from "./aiRouter";
import spotifyRouter  from "./spotifyToken";
import googleCalendarRouter from "./googleCalendarOAuth";
import { emailRouter } from "./emailRouter";

dotenv.config();

const app = express();

app.set("trust proxy", true);

app.use(cors());
app.use(express.json());

app.use("/api/weather", weatherRouter);
app.use("/api/news", newsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/spotify", spotifyRouter);
app.use("/api/google-calendar", googleCalendarRouter);
app.use("/api/email", emailRouter);

app.get("/health", (_, res) => res.send("OK"));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
  console.log(`Weather endpoint: http://localhost:${PORT}/api/weather?lat=59.91&lon=10.75`);
  console.log(`News endpoint: http://localhost:${PORT}/api/news?country=no`);
});
