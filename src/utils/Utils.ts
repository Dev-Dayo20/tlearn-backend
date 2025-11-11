import jwt from "jsonwebtoken";
import { AUthPayload } from "./types";

export function isEmailValid(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string") {
    return false;
  }
  return emailRegex.test(email);
}

function getSecretKey(): string {
  const secret = process.env.SECRET_KEY;
  if (!secret) {
    throw new Error("SECRET_KEY is not defined in environment variables");
  }
  return secret;
}

export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  retries = 2,
  delay = 500
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      if (
        error.code === "P1001" ||
        error.message?.includes("Can't reach database")
      ) {
        console.log(`🔄 DB connection retry ${i + 1}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Don't retry other errors (wrong password, user not found, etc.)
        throw error;
      }
    }
  }

  throw lastError;
}

export function generateToken(payload: AUthPayload): string {
  return jwt.sign(payload, getSecretKey(), {
    expiresIn: "30m",
  });
}

export function verifyToken(token: string): AUthPayload {
  try {
    return jwt.verify(token, getSecretKey()) as AUthPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

export function decodeToken(token: string): AUthPayload | null {
  try {
    return jwt.decode(token) as AUthPayload;
  } catch (error) {
    return null;
  }
}
