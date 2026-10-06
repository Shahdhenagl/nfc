import type { Request } from "express";
import { ACCESS_COOKIE } from "@shared/constants";
import { readCookie, verifyAccessSession, type AccessSessionPayload } from "../security";

export function getAccessSession(req: Request): AccessSessionPayload | null {
  return verifyAccessSession(readCookie(req, ACCESS_COOKIE));
}
