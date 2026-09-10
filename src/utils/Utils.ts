import jwt from "jsonwebtoken";
import { AUthPayload, SchoolUsersPayload } from "./types";
import { AppError } from "./AppError";

export function isEmailValid(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string") {
    return false;
  }
  return emailRegex.test(email);
}

export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  retries = 2,
  delay = 500,
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

//FUNCTION TO GNERATE SECRET KEY
function getSecretKey(): string {
  const secret = process.env.SECRET_KEY;
  if (!secret) {
    throw new Error(" Not defined in environment variables");
  }
  return secret;
}

// FUNCTION TO GET COOKIE OPTIONS
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    domain: isProduction ? ".tlearn.africa" : undefined,
    path: "/",
  };
}

//FUNCTION TO GENERATE REFRESH SECRET KEY
function getRefreshKey(): string {
  const secret = process.env.REFRESH_SECRET_KEY;
  if (!secret) {
    throw new Error("Not defined in environment variables");
  }
  return secret;
}

// FUNCTION TO GENERATE SCHOOL USER TOKEN
export function generateSchoolUserToken(payload: SchoolUsersPayload): string {
  return jwt.sign(payload, getSecretKey(), {
    expiresIn: "30m",
  });
}

export function generateSchoolUserRefreshToken(
  payload: SchoolUsersPayload,
): string {
  return jwt.sign(payload, getRefreshKey(), {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

export function verifyRefreshToken(token: string): any {
  try {
    return jwt.verify(token, getRefreshKey());
  } catch (error) {
    throw new AppError("Invalid or expired token", 401);
  }
}

// HELPER FUNCTION TO VERIFY TOKEN
export function verifyToken(token: string): AUthPayload {
  try {
    return jwt.verify(token, getSecretKey()) as AUthPayload;
  } catch (error) {
    throw new AppError("Invalid or expired token", 401);
  }
}

// FUNCTION TO DECODE TOKEN
export function decodeToken(token: string): AUthPayload | null {
  try {
    return jwt.decode(token) as AUthPayload;
  } catch (error) {
    return null;
  }
}

// HEPLPER FUNCTION TO CLACULATE TIME AGO
export function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)} hour${
      Math.floor(seconds / 3600) > 1 ? "s" : ""
    } ago`;
  if (seconds < 2592000)
    return `${Math.floor(seconds / 86400)} day${
      Math.floor(seconds / 86400) > 1 ? "s" : ""
    } ago`;

  return date.toLocaleDateString();
}
