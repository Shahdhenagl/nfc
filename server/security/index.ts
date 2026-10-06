import crypto from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import { ACCESS_COOKIE, DEVICE_COOKIE } from "@shared/constants";

const memoryRate = new Map<string, { count: number; resetAt: number }>();

function sessionSecret() {
  return process.env.NFC_SESSION_SECRET || process.env.MANUS_JWT_SECRET || "local-development-only-nfc-secret";
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashSecret(secret: string) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(secret, salt, 64);
  return `s2$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifySecret(secret: string, stored: string) {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const derived = crypto.scryptSync(secret, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode<T>(value: string): T | null {
  try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T; } catch { return null; }
}

export type AccessSessionPayload = {
  licenseId: number;
  productId: number;
  cardId: number;
  deviceTokenHash: string;
  iat: number;
  exp: number;
};

export function signAccessSession(payload: Omit<AccessSessionPayload, "iat" | "exp">, ttlMs = 1000 * 60 * 60 * 12) {
  const data: AccessSessionPayload = { ...payload, iat: Date.now(), exp: Date.now() + ttlMs };
  const body = encode(data);
  const signature = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyAccessSession(value: string | undefined) {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = decode<AccessSessionPayload>(body);
  if (!payload || payload.exp < Date.now()) return null;
  return payload;
}

export function readCookie(req: Request, name: string) {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

function cookieOptions(req: Request): CookieOptions {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const secure = forwardedProto === "https" || req.protocol === "https";
  return { httpOnly: true, path: "/", secure, sameSite: secure ? "none" : "lax", maxAge: 1000 * 60 * 60 * 24 * 365 };
}

export function setAccessCookies(req: Request, res: Response, deviceToken: string, session: string) {
  const options = cookieOptions(req);
  res.cookie(DEVICE_COOKIE, deviceToken, options);
  res.cookie(ACCESS_COOKIE, session, options);
}

export function clearAccessCookies(req: Request, res: Response) {
  const options = cookieOptions(req);
  res.clearCookie(DEVICE_COOKIE, options);
  res.clearCookie(ACCESS_COOKIE, options);
}

export function getClientSignals(req: Request) {
  const userAgent = String(req.headers["user-agent"] || "unknown").slice(0, 1000);
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  const ip = (forwarded.split(",")[0] || req.socket.remoteAddress || "unknown").trim().slice(0, 128);
  const fingerprint = String(req.headers["x-device-fingerprint"] || "").slice(0, 128) || hashToken(userAgent);
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Other";
  const operatingSystem = /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "Other";
  return { userAgent, ip, fingerprint, browser, operatingSystem };
}

export function rateLimit(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const entry = memoryRate.get(key);
  if (!entry || entry.resetAt < now) {
    memoryRate.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  entry.count += 1;
  return { allowed: entry.count <= limit, retryAfter: Math.max(0, entry.resetAt - now) };
}
