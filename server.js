import "./loadEnv.js";
import express from "express";
import cors from "cors";
import contactRoutes from "./src/contact/routes/contact.js";
import { getTelegramConfig, isTelegramEnabled } from "./src/telegram/config/telegram.js";
import {
  getTelegramHealthDetails,
  sendTelegramMessage,
  verifyTelegramConfig,
} from "./src/telegram/services/telegramClient.js";

{
  const tg = getTelegramConfig();
  if (tg.token && !tg.chatIds.length) {
    console.warn("WARNING: токен задан, но TELEGRAM_CHAT_ID пустой — Telegram отключён");
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3002;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      const whitelist = allowedOrigins.length ? allowedOrigins : [];
      if (!origin) return callback(null, true);
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      if (whitelist.includes(origin) || isLocal) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "unknown";
};

const rateLimit = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const current = rateLimitStore.get(ip);
  if (!current || now > current.expiresAt) {
    rateLimitStore.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (current.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }
  current.count += 1;
  rateLimitStore.set(ip, current);
  return next();
};

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Balu Server",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/telegram", async (req, res) => {
  const ok = await verifyTelegramConfig();
  res.json({
    success: ok,
    details: getTelegramHealthDetails(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/telegram/send-test", async (req, res) => {
  try {
    const text = typeof req.query.text === "string" ? req.query.text : "";
    const safeText = (text || "ping").slice(0, 300);
    const result = await sendTelegramMessage(`<b>Balu Server:</b> ${safeText}`);
    res.json({
      success: true,
      result,
      details: getTelegramHealthDetails(),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e?.message || String(e),
      details: getTelegramHealthDetails(),
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/api", rateLimit);
app.use("/api/contact", contactRoutes);

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.path,
  });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log("=".repeat(50));
    console.log(`Balu Server — http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(
      `Telegram: ${isTelegramEnabled() ? "включён" : "ВЫКЛЮЧЕН (проверь .env рядом с server.js: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)"}`
    );
    console.log("=".repeat(50));
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
    process.exit(1);
  });
}

export default app;
