import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { globalRateLimit } from "./middleware/rateLimit.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use(globalRateLimit);

app.set("trust proxy", 1);

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

import adminRoutes from "./routes/admin";

app.use("/api/v1/admin", adminRoutes);

app.use(errorMiddleware);

export { app };
