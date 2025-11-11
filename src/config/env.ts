import dotenv from "dotenv";
dotenv.config();

// Validate all required environment variables
export const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) throw new Error("SECRET_KEY missing");

export const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL missing");

// Export all env vars from one place
export default {
  SECRET_KEY,
  DATABASE_URL,
  PORT: process.env.PORT || 5000,
};
