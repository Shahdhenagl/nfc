import { z } from "zod";

export const productSlugSchema = z.enum(["foreign", "quran", "arabic", "shaabi"]);
export const accessTokenSchema = z.string().trim().min(6).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const passwordSchema = z.string().min(4).max(128);
export const contentTypeSchema = z.enum(["song", "album", "artist", "playlist", "surah", "reciter", "zekr", "ruqyah"]);
export const paginationSchema = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(25) });
