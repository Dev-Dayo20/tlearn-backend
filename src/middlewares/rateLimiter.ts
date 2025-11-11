import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute
  message: { error: "Too many login attempts. Please try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});
