import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
dotenv.config();

import mainRouter from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (for some UI libraries)
        imgSrc: ["'self'", "data:", "https:"], // Allow images from https and data URIs
        connectSrc: ["'self'"], // Allow API calls to same origin
        fontSrc: ["'self'", "data:"], // Allow fonts
        objectSrc: ["'none'"], // Block plugins
        mediaSrc: ["'self'"], // Allow media from same origin
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://tlearn.africa",
            "https://admin.tlearn.africa",
            "https://*.tlearn.africa", // Wildcard for schools
            // "https://tlearn-ten.vercel.app",
          ]
        : [
            "http://localhost:8080",
            "http://localhost:5173",
            /^http:\/\/[a-z]+\.localhost:8080$/, // ✅ Only lowercase letters
            /^http:\/\/[a-z]+\.localhost:5173$/, // ✅ Only lowercase letters
          ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-School-Subdomain"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/tlearn", mainRouter);

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "tLearn Backend is running!",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.get("/healthz", (_, res) => {
  res.status(200).send("ok");
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running `);
  // console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  // console.log(`🔒 Security headers enabled`);
});
