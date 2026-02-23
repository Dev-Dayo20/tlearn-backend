import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import dotenv from "dotenv";
import helmet from "helmet";
dotenv.config();

import mainRouter from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const allowedOrigins =
        process.env.NODE_ENV === "production"
          ? ["https://tlearn.africa", "https://admin.tlearn.africa"]
          : ["http://localhost:8080", "http://localhost:5173"];

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check if origin matches wildcard pattern for school subdomains
      const productionWildcard = /^https:\/\/[a-z0-9-]+\.tlearn\.africa$/;
      const devWildcard = /^http:\/\/[a-z0-9-]+\.localhost:(8080|5173)$/;

      const wildcardPattern =
        process.env.NODE_ENV === "production"
          ? productionWildcard
          : devWildcard;

      if (wildcardPattern.test(origin)) {
        return callback(null, true);
      }

      // Reject all other origins
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-School-Subdomain"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

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
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
    crossOriginOpenerPolicy: { policy: "unsafe-none" }, // Allow cross-origin openers
  }),
);

app.use(compression());
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
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  if (process.env.NODE_ENV === "development") {
    console.log(`🔒 Security headers enabled`);
  }
});
