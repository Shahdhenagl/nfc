import { Readable } from "node:stream";
import { and, eq, sql } from "drizzle-orm";
import { contentItems } from "../drizzle/schema";

const AUDIUS_BASE = "https://api.audius.co/v1";
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; value: AudiusTrack[] }>();

export type AudiusTrack = {
  id: number;
  externalId: string;
  contentType: "song";
  titleEn: string;
  titleAr: string;
  subtitle: string;
  artistOrReciter: string;
  albumOrCategory: string;
  durationSeconds: number;
  mediaUrl: string;
  coverImage: string;
  source: "audius";
  sourceUrl: string;
};

function apiKey() { return process.env.AUDIUS_API_KEY || ""; }
function artwork(track: any) { return track?.artwork?.["480x480"] || track?.artwork?.["150x150"] || track?.artwork?.mirrored || ""; }
function stableId(value: string) { let hash = 2166136261; for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return Math.abs(hash >>> 0) || 1; }

function normalizeTrack(track: any): AudiusTrack | null {
  const externalId = String(track?.id || "");
  if (!/^[A-Za-z0-9_-]+$/.test(externalId) || !track?.title) return null;
  const id = stableId(externalId);
  return {
    id,
    externalId,
    contentType: "song",
    titleEn: String(track.title).slice(0, 240),
    titleAr: String(track.title).slice(0, 240),
    subtitle: `Audius · ${track?.genre || "Music"}`.slice(0, 240),
    artistOrReciter: String(track?.user?.name || "Audius artist").slice(0, 180),
    albumOrCategory: String(track?.genre || "Egyptian music").slice(0, 180),
    durationSeconds: Math.max(1, Number(track.duration) || 1),
    mediaUrl: `/api/audius/stream/${externalId}`,
    coverImage: artwork(track),
    source: "audius",
    sourceUrl: String(track?.permalink ? `https://audius.co${track.permalink}` : `https://audius.co/track/${externalId}`),
  };
}

async function audiusRequest(path: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey()) headers.Authorization = `Bearer ${apiKey()}`;
  const response = await fetch(`${AUDIUS_BASE}/${path}`, {
    headers,
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Audius request failed with ${response.status}`);
  return response.json() as Promise<{ data?: any[] }>;
}

export async function getAudiusCatalog(productSlug: string, query?: string) {
  if (productSlug === "quran") return [];
  const searchQuery = query?.trim() || (productSlug === "shaabi" ? "egyptian shaabi" : productSlug === "arabic" ? "egyptian arabic" : "arabic egyptian");
  const key = `${productSlug}:${searchQuery.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const result = await audiusRequest(`tracks/search?query=${encodeURIComponent(searchQuery)}&limit=24&offset=0`);
    let tracks = (result?.data || []).map(normalizeTrack).filter(Boolean) as AudiusTrack[];
    if (!tracks.length) {
      const fallback = await audiusRequest("tracks/trending?limit=24");
      tracks = (fallback?.data || []).map(normalizeTrack).filter(Boolean) as AudiusTrack[];
    }
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value: tracks });
    return tracks;
  } catch (error) {
    console.error("[Audius] catalog unavailable:", error instanceof Error ? error.message : "unknown error");
    return [];
  }
}

export async function syncAudiusContent(db: any, productId: number, tracks: AudiusTrack[]) {
  const synced: any[] = [];
  for (const track of tracks) {
    const existing = await db.select().from(contentItems).where(and(
      eq(contentItems.productId, productId),
      sql`JSON_UNQUOTE(JSON_EXTRACT(${contentItems.metadata}, '$.audiusId')) = ${track.externalId}`,
    )).limit(1);
    if (existing[0]) {
      synced.push({ ...existing[0], mediaUrl: track.mediaUrl, source: "audius", sourceUrl: track.sourceUrl });
      continue;
    }
    const inserted = await db.insert(contentItems).values({
      productId,
      contentType: "song",
      titleEn: track.titleEn,
      titleAr: track.titleAr,
      subtitle: track.subtitle,
      artistOrReciter: track.artistOrReciter,
      albumOrCategory: track.albumOrCategory,
      durationSeconds: track.durationSeconds,
      mediaUrl: track.mediaUrl,
      coverImage: track.coverImage,
      metadata: { audiusId: track.externalId, source: "audius", sourceUrl: track.sourceUrl },
      status: "published",
    }).$returningId();
    synced.push({ ...track, id: inserted[0]?.id });
  }
  return synced;
}

export async function streamAudiusTrack(trackId: string, req: any, res: any) {
  if (!/^[A-Za-z0-9_-]+$/.test(trackId)) return false;
  const headers: Record<string, string> = { Accept: "audio/mpeg" };
  if (req.headers.range) headers.Range = req.headers.range;
  if (apiKey()) headers.Authorization = `Bearer ${apiKey()}`;
  const response = await fetch(`${AUDIUS_BASE}/tracks/${trackId}/stream?app_name=nfc-vault`, { headers, redirect: "follow", signal: AbortSignal.timeout(30_000) });
  if (!response.ok || !response.body) return false;
  res.status(response.status);
  for (const header of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = response.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  res.setHeader("Cache-Control", "private, max-age=300");
  Readable.fromWeb(response.body as any).pipe(res);
  return true;
}
