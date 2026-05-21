import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { weatherRouter } from "./weatherRouter";
import { newsRouter } from "./newsRouter";
import { aiRouter } from "./aiRouter";
import spotifyRouter  from "./spotifyToken";
import googleCalendarRouter from "./googleCalendarOAuth";
import outlookCalendarRouter from "./outlookCalendarRouter";
import { emailRouter } from "./emailRouter";

dotenv.config();

const app = express();

const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);


if (!allowedOrigins.length) {
  allowedOrigins.push("http://127.0.0.1:5173", "http://localhost:5173", "https://panelia.web.app", "https://panelia.firebaseapp.com");
}

// Cloud Run/proxy-støtte for korrekt secure-cookie/HTTPS-deteksjon.
app.set("trust proxy", 1);

app.use(
  cors({
    // Stram CORS: tillat kun kjente frontend-origins.
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);

// Grunnleggende sikkerhetsheadere uten ekstern avhengighet.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(express.json({ limit: "200kb" }));

app.use("/api/weather", weatherRouter);
app.use("/api/news", newsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/spotify", spotifyRouter);
app.use("/api/google-calendar", googleCalendarRouter);
app.use("/api/outlook-calendar", outlookCalendarRouter);
app.use("/api/email", emailRouter);

app.get("/health", (_, res) => res.send("OK"));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
  console.log(`Weather endpoint: http://localhost:${PORT}/api/weather?lat=59.91&lon=10.75`);
  console.log(`News endpoint: http://localhost:${PORT}/api/news?country=no`);
});
