import { and, count, desc, eq, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  auditLogs,
  contentItems,
  deviceRegistrations,
  deviceResetRequests,
  favorites,
  licenses,
  loginAttempts,
  nfcCards,
  playlistItems,
  playlists,
  products,
  recentlyPlayed,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getAccessSession } from "./access/session";
import {
  clearAccessCookies,
  getClientSignals,
  hashSecret,
  hashToken,
  randomToken,
  rateLimit,
  readCookie,
  setAccessCookies,
  signAccessSession,
  verifySecret,
} from "./security";
import { ACCESS_COOKIE, DEVICE_COOKIE, DEVICE_MISMATCH_AR, DEVICE_MISMATCH_EN, PRODUCT_META } from "@shared/constants";
import { accessTokenSchema, contentTypeSchema, passwordSchema, productSlugSchema } from "@shared/validation";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { getAudiusCatalog, syncAudiusContent } from "./audius";

const DEMO_CARDS = {
  "FR-DEMO01": { id: 1, cardId: 1, licenseId: 1, productId: 1, slug: "foreign" as const, password: "demo1234", nfcCode: "FR-DEMO01", name: "Foreign Music", status: "active" as const },
  "QN-DEMO01": { id: 2, cardId: 2, licenseId: 2, productId: 2, slug: "quran" as const, password: "demo1234", nfcCode: "QN-DEMO01", name: "Quran & Azkar", status: "active" as const },
  "AR-DEMO01": { id: 3, cardId: 3, licenseId: 3, productId: 3, slug: "arabic" as const, password: "demo1234", nfcCode: "AR-DEMO01", name: "Arabic Music — Tarab & Art", status: "active" as const },
  "SH-DEMO01": { id: 4, cardId: 4, licenseId: 4, productId: 4, slug: "shaabi" as const, password: "demo1234", nfcCode: "SH-DEMO01", name: "Shaabi Music", status: "active" as const },
};
const demoDeviceByLicense = new Map<number, string>();
const demoFavoritesByLicense = new Map<number, Set<number>>();
const demoProgressByLicense = new Map<number, Map<number, number>>();

function demoCard(token: string) {
  return Object.values(DEMO_CARDS).find(card => token.toUpperCase() === card.nfcCode || token === card.slug);
}

function contentFor(slug: keyof typeof PRODUCT_META) {
  if (slug === "quran") {
    return [
      { id: 201, contentType: "surah", titleEn: "Al-Fatihah", titleAr: "سورة الفاتحة", subtitle: "Mishary Alafasy", artistOrReciter: "Mishary Alafasy", albumOrCategory: "Surahs", durationSeconds: 124, mediaUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3", coverImage: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=900&q=80" },
      { id: 202, contentType: "surah", titleEn: "Yaseen", titleAr: "سورة يس", subtitle: "Abdul Basit", artistOrReciter: "Abdul Basit", albumOrCategory: "Surahs", durationSeconds: 1860, mediaUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/36.mp3", coverImage: "https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=900&q=80" },
      { id: 203, contentType: "zekr", titleEn: "Morning Azkar", titleAr: "أذكار الصباح", subtitle: "A gentle start to your day", artistOrReciter: "Daily collection", albumOrCategory: "Morning", durationSeconds: 480, mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", coverImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80" },
      { id: 204, contentType: "zekr", titleEn: "Evening Azkar", titleAr: "أذكار المساء", subtitle: "Close the day with remembrance", artistOrReciter: "Daily collection", albumOrCategory: "Evening", durationSeconds: 520, mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", coverImage: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80" },
      { id: 205, contentType: "ruqyah", titleEn: "Ruqyah", titleAr: "الرقية الشرعية", subtitle: "Focused recitation", artistOrReciter: "Abdul Rahman Al-Sudais", albumOrCategory: "Ruqyah", durationSeconds: 1360, mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", coverImage: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=900&q=80" },
    ];
  }
  return [
    { id: 101, contentType: "song", titleEn: "Midnight Radio", titleAr: "راديو منتصف الليل", subtitle: "Demo release · 2026", artistOrReciter: "Northline", albumOrCategory: "New releases", durationSeconds: 214, mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80" },
    { id: 102, contentType: "song", titleEn: "Slow Motion", titleAr: "حركة بطيئة", subtitle: "Trending now", artistOrReciter: "Luma", albumOrCategory: "Trending", durationSeconds: 198, mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", coverImage: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80" },
    { id: 103, contentType: "song", titleEn: "Afterglow", titleAr: "أفترغلو", subtitle: "A quiet favorite", artistOrReciter: "Atlas House", albumOrCategory: "Favorites", durationSeconds: 242, mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", coverImage: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80" },
    { id: 104, contentType: "album", titleEn: "Night Drive", titleAr: "مشوار الليل", subtitle: "8 tracks · 42 min", artistOrReciter: "Various artists", albumOrCategory: "Albums", durationSeconds: 2520, mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", coverImage: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80" },
    { id: 105, contentType: "song", titleEn: "Golden Hour", titleAr: "الساعة الذهبية", subtitle: "Classic mood", artistOrReciter: "Sunroom", albumOrCategory: "Recently played", durationSeconds: 205, mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", coverImage: "https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=900&q=80" },
  ];
}

function getDemoRecord(accessToken: string) {
  const card = demoCard(accessToken);
  return card ? { card, license: { id: card.licenseId, productId: card.productId, status: "active" as const, passwordHash: hashSecret(card.password), expiresAt: null }, product: { id: card.productId, slug: card.slug, name: card.name, type: PRODUCT_META[card.slug].type } } : null;
}

async function getCardRecord(accessToken: string) {
  const db = await getDb();
  if (!db) return getDemoRecord(accessToken);
  const rows = await db.select({ card: nfcCards, license: licenses, product: products })
    .from(nfcCards)
    .innerJoin(licenses, eq(nfcCards.licenseId, licenses.id))
    .innerJoin(products, eq(nfcCards.productId, products.id))
    .where(eq(nfcCards.accessToken, accessToken))
    .limit(1);
  return rows[0] || getDemoRecord(accessToken);
}

async function recordAttempt(input: { licenseId?: number; accessToken: string; success: boolean; reason?: string; req: Parameters<typeof getClientSignals>[0]; deviceId?: number }) {
  const db = await getDb();
  if (!db) return;
  const signals = getClientSignals(input.req);
  await db.insert(loginAttempts).values({ licenseId: input.licenseId, accessToken: input.accessToken, ipAddress: signals.ip, userAgent: signals.userAgent, deviceId: input.deviceId, success: input.success, failureReason: input.reason });
}

async function ensureResetRequest(cardId: number, licenseId: number, deviceId: number | undefined, requestedBy: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(deviceResetRequests).where(and(eq(deviceResetRequests.licenseId, licenseId), eq(deviceResetRequests.status, "pending"))).limit(1);
  if (!existing.length) await db.insert(deviceResetRequests).values({ cardId, licenseId, deviceId, requestedBy, reason: "Access attempted from a different device" });
}

const accessRouter = router({
  getCard: publicProcedure.input(z.object({ accessToken: accessTokenSchema })).query(async ({ input }) => {
    const record = await getCardRecord(input.accessToken);
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "This NFC card could not be found." });
    return { accessToken: input.accessToken, product: { slug: record.product.slug, name: record.product.name, type: record.product.type }, status: record.card.status };
  }),
  activate: publicProcedure.input(z.object({ accessToken: accessTokenSchema, password: passwordSchema })).mutation(async ({ input, ctx }) => {
    const signals = getClientSignals(ctx.req);
    const key = `${input.accessToken}:${signals.ip}`;
    const rate = rateLimit(key);
    if (!rate.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." });
    const record = await getCardRecord(input.accessToken);
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "This NFC card could not be found." });
    const activeCard = record.card.status !== "disabled" && record.card.status !== "suspended";
    const activeLicense = ["pending", "active"].includes(record.license.status) && (!record.license.expiresAt || record.license.expiresAt > new Date());
    if (!activeCard || !activeLicense || !verifySecret(input.password, record.license.passwordHash)) {
      await recordAttempt({ licenseId: record.license.id, accessToken: input.accessToken, success: false, reason: "invalid_credentials_or_inactive", req: ctx.req });
      throw new TRPCError({ code: "UNAUTHORIZED", message: "The password or card status is not valid." });
    }

    const rawDeviceToken = readCookie(ctx.req, DEVICE_COOKIE);
    const presentedHash = rawDeviceToken ? hashToken(rawDeviceToken) : undefined;
    const db = await getDb();
    let deviceToken = rawDeviceToken;
    let deviceId: number | undefined;
    let registeredHash: string | undefined;

    if (!db) {
      registeredHash = demoDeviceByLicense.get(record.license.id);
      if (!registeredHash) {
        deviceToken = randomToken(32);
        registeredHash = hashToken(deviceToken);
        demoDeviceByLicense.set(record.license.id, registeredHash);
      } else if (registeredHash !== presentedHash) {
        await recordAttempt({ licenseId: record.license.id, accessToken: input.accessToken, success: false, reason: "device_mismatch", req: ctx.req });
        throw new TRPCError({ code: "FORBIDDEN", message: `${DEVICE_MISMATCH_EN} ${DEVICE_MISMATCH_AR}` });
      }
    } else {
      const registered = await db.select().from(deviceRegistrations).where(and(eq(deviceRegistrations.licenseId, record.license.id), eq(deviceRegistrations.status, "active"))).limit(1);
      if (!registered.length) {
        deviceToken = randomToken(32);
        registeredHash = hashToken(deviceToken);
        const inserted = await db.insert(deviceRegistrations).values({ licenseId: record.license.id, deviceTokenHash: registeredHash, fingerprint: signals.fingerprint, browser: signals.browser, operatingSystem: signals.operatingSystem, userAgent: signals.userAgent, firstIp: signals.ip, lastIp: signals.ip }).$returningId();
        deviceId = inserted[0]?.id;
        await db.update(licenses).set({ status: "active", activatedAt: new Date() }).where(eq(licenses.id, record.license.id));
        await db.update(nfcCards).set({ status: "active", activatedAt: new Date() }).where(eq(nfcCards.id, record.card.id));
      } else {
        deviceId = registered[0].id;
        registeredHash = registered[0].deviceTokenHash;
        if (registeredHash !== presentedHash) {
          await recordAttempt({ licenseId: record.license.id, accessToken: input.accessToken, success: false, reason: "device_mismatch", req: ctx.req, deviceId });
          await ensureResetRequest(record.card.id, record.license.id, deviceId, signals.ip);
          throw new TRPCError({ code: "FORBIDDEN", message: `${DEVICE_MISMATCH_EN} ${DEVICE_MISMATCH_AR}` });
        }
        await db.update(deviceRegistrations).set({ lastSeenAt: new Date(), lastIp: signals.ip, fingerprint: signals.fingerprint }).where(eq(deviceRegistrations.id, deviceId));
      }
    }

    if (!deviceToken) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to establish device security." });
    const session = signAccessSession({ licenseId: record.license.id, productId: record.product.id, cardId: record.card.id, deviceTokenHash: registeredHash || hashToken(deviceToken) });
    setAccessCookies(ctx.req, ctx.res, deviceToken, session);
    await recordAttempt({ licenseId: record.license.id, accessToken: input.accessToken, success: true, req: ctx.req, deviceId });
    return { ok: true, redirect: "/library", product: { slug: record.product.slug, name: record.product.name, type: record.product.type } };
  }),
  library: publicProcedure.query(async ({ ctx }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) {
      const slug = Object.values(DEMO_CARDS).find(card => card.productId === session.productId)?.slug || "foreign";
      const favoriteIds = [...(demoFavoritesByLicense.get(session.licenseId) || new Set<number>())];
      const progress = demoProgressByLicense.get(session.licenseId) || new Map<number, number>();
      const audiusItems = await getAudiusCatalog(slug);
      return { session, product: PRODUCT_META[slug], items: [...contentFor(slug), ...audiusItems], favoriteIds, recentlyPlayed: [...progress.entries()].map(([contentId, positionSeconds]) => ({ contentId, positionSeconds, playedAt: new Date() })) };
    }
    const product = await db.select().from(products).where(eq(products.id, session.productId)).limit(1);
    if (!product[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
    const storedItems = await db.select().from(contentItems).where(and(eq(contentItems.productId, session.productId), eq(contentItems.status, "published"))).orderBy(contentItems.sortOrder, desc(contentItems.createdAt));
    const audiusTracks = await getAudiusCatalog(product[0].slug);
    const items = product[0].type === "music" ? [...storedItems, ...(await syncAudiusContent(db, session.productId, audiusTracks))] : storedItems;
    const favoriteRows = await db.select({ contentId: favorites.contentId }).from(favorites).where(eq(favorites.licenseId, session.licenseId));
    const recentRows = await db.select({ contentId: recentlyPlayed.contentId, positionSeconds: recentlyPlayed.positionSeconds, playedAt: recentlyPlayed.playedAt }).from(recentlyPlayed).where(eq(recentlyPlayed.licenseId, session.licenseId)).orderBy(desc(recentlyPlayed.playedAt)).limit(20);
    return { session, product: { ...product[0], meta: PRODUCT_META[product[0].slug as keyof typeof PRODUCT_META] }, items, favoriteIds: favoriteRows.map(row => row.contentId), recentlyPlayed: recentRows };
  }),
  toggleFavorite: publicProcedure.input(z.object({ contentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) {
      const favoriteIds = demoFavoritesByLicense.get(session.licenseId) || new Set<number>();
      const isFavorite = favoriteIds.has(input.contentId);
      if (isFavorite) favoriteIds.delete(input.contentId); else favoriteIds.add(input.contentId);
      demoFavoritesByLicense.set(session.licenseId, favoriteIds);
      return { isFavorite: !isFavorite };
    }
    const content = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, input.contentId), eq(contentItems.productId, session.productId))).limit(1);
    if (!content[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Content is not part of this product." });
    const existing = await db.select({ id: favorites.id }).from(favorites).where(and(eq(favorites.licenseId, session.licenseId), eq(favorites.contentId, input.contentId))).limit(1);
    if (existing[0]) { await db.delete(favorites).where(eq(favorites.id, existing[0].id)); return { isFavorite: false }; }
    await db.insert(favorites).values({ licenseId: session.licenseId, contentId: input.contentId });
    return { isFavorite: true };
  }),
  recordProgress: publicProcedure.input(z.object({ contentId: z.number().int().positive(), positionSeconds: z.number().int().min(0).max(86400) })).mutation(async ({ ctx, input }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) {
      const progress = demoProgressByLicense.get(session.licenseId) || new Map<number, number>();
      progress.set(input.contentId, input.positionSeconds);
      demoProgressByLicense.set(session.licenseId, progress);
      return { ok: true };
    }
    const content = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, input.contentId), eq(contentItems.productId, session.productId))).limit(1);
    if (!content[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Content is not part of this product." });
    const existing = await db.select({ id: recentlyPlayed.id }).from(recentlyPlayed).where(and(eq(recentlyPlayed.licenseId, session.licenseId), eq(recentlyPlayed.contentId, input.contentId))).limit(1);
    if (existing[0]) await db.update(recentlyPlayed).set({ positionSeconds: input.positionSeconds, playedAt: new Date() }).where(eq(recentlyPlayed.id, existing[0].id));
    else await db.insert(recentlyPlayed).values({ licenseId: session.licenseId, contentId: input.contentId, positionSeconds: input.positionSeconds });
    return { ok: true };
  }),
  playlists: publicProcedure.query(async ({ ctx }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(playlists).where(and(eq(playlists.licenseId, session.licenseId), eq(playlists.productId, session.productId))).orderBy(desc(playlists.createdAt));
    return Promise.all(rows.map(async playlist => {
      const rowsWithContent = await db.select({ content: contentItems }).from(playlistItems).innerJoin(contentItems, eq(playlistItems.contentId, contentItems.id)).where(eq(playlistItems.playlistId, playlist.id)).orderBy(playlistItems.sortOrder, playlistItems.id);
      return { ...playlist, items: rowsWithContent.map(row => row.content) };
    }));
  }),
  createPlaylist: publicProcedure.input(z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(300).optional() })).mutation(async ({ ctx, input }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) return { ok: true, playlist: { id: Date.now(), nameEn: input.name, nameAr: input.name, items: [] } };
    const inserted = await db.insert(playlists).values({ licenseId: session.licenseId, productId: session.productId, nameEn: input.name, nameAr: input.name, description: input.description }).$returningId();
    return { ok: true, playlist: { id: inserted[0]?.id, nameEn: input.name, nameAr: input.name, items: [] } };
  }),
  addToPlaylist: publicProcedure.input(z.object({ playlistId: z.number().int().positive(), contentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) return { ok: true };
    const playlist = await db.select({ id: playlists.id }).from(playlists).where(and(eq(playlists.id, input.playlistId), eq(playlists.licenseId, session.licenseId), eq(playlists.productId, session.productId))).limit(1);
    const content = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, input.contentId), eq(contentItems.productId, session.productId))).limit(1);
    if (!playlist[0] || !content[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Playlist or content not found." });
    const existing = await db.select({ id: playlistItems.id }).from(playlistItems).where(and(eq(playlistItems.playlistId, input.playlistId), eq(playlistItems.contentId, input.contentId))).limit(1);
    if (!existing[0]) await db.insert(playlistItems).values({ playlistId: input.playlistId, contentId: input.contentId, sortOrder: 0 });
    return { ok: true };
  }),
  removeFromPlaylist: publicProcedure.input(z.object({ playlistId: z.number().int().positive(), contentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) return { ok: true };
    const owned = await db.select({ id: playlists.id }).from(playlists).where(and(eq(playlists.id, input.playlistId), eq(playlists.licenseId, session.licenseId))).limit(1);
    if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found." });
    await db.delete(playlistItems).where(and(eq(playlistItems.playlistId, input.playlistId), eq(playlistItems.contentId, input.contentId)));
    return { ok: true };
  }),
  deletePlaylist: publicProcedure.input(z.object({ playlistId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) return { ok: true };
    const owned = await db.select({ id: playlists.id }).from(playlists).where(and(eq(playlists.id, input.playlistId), eq(playlists.licenseId, session.licenseId))).limit(1);
    if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found." });
    await db.delete(playlistItems).where(eq(playlistItems.playlistId, input.playlistId));
    await db.delete(playlists).where(eq(playlists.id, input.playlistId));
    return { ok: true };
  }),
  myCard: publicProcedure.query(async ({ ctx }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) return { product: PRODUCT_META[Object.values(DEMO_CARDS).find(card => card.productId === session.productId)?.slug || "foreign"], license: { status: "active", activatedAt: new Date(), expiresAt: null }, device: { status: "active", browser: "Your current browser", operatingSystem: "Your current device", lastSeenAt: new Date() } };
    const row = await db.select({ card: nfcCards, license: licenses, product: products }).from(nfcCards).innerJoin(licenses, eq(nfcCards.licenseId, licenses.id)).innerJoin(products, eq(nfcCards.productId, products.id)).where(eq(nfcCards.id, session.cardId)).limit(1);
    if (!row[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Card record not found." });
    const device = await db.select().from(deviceRegistrations).where(and(eq(deviceRegistrations.licenseId, session.licenseId), eq(deviceRegistrations.deviceTokenHash, session.deviceTokenHash))).limit(1);
    return { ...row[0], device: device[0] || null };
  }),
  requestDeviceReset: publicProcedure.input(z.object({ reason: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const session = getAccessSession(ctx.req);
    if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your NFC session has expired." });
    const db = await getDb();
    if (!db) return { ok: true, status: "pending" };
    const device = await db.select({ id: deviceRegistrations.id }).from(deviceRegistrations).where(and(eq(deviceRegistrations.licenseId, session.licenseId), eq(deviceRegistrations.deviceTokenHash, session.deviceTokenHash))).limit(1);
    const existing = await db.select({ id: deviceResetRequests.id }).from(deviceResetRequests).where(and(eq(deviceResetRequests.licenseId, session.licenseId), eq(deviceResetRequests.status, "pending"))).limit(1);
    if (!existing.length) await db.insert(deviceResetRequests).values({ licenseId: session.licenseId, cardId: session.cardId, deviceId: device[0]?.id, requestedBy: getClientSignals(ctx.req).ip, reason: input.reason || "Customer requested a device change" });
    return { ok: true, status: "pending" };
  }),
  logout: publicProcedure.mutation(({ ctx }) => { clearAccessCookies(ctx.req, ctx.res); return { ok: true }; }),
});

const adminRouter = router({
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { products: 4, licenses: 248, activeCards: 231, pendingResets: 7, failedAttempts: 19 };
    const [[productCount], [licenseCount], [activeCount], [resetCount], [failedCount]] = await Promise.all([
      db.select({ value: count() }).from(products),
      db.select({ value: count() }).from(licenses),
      db.select({ value: count() }).from(nfcCards).where(eq(nfcCards.status, "active")),
      db.select({ value: count() }).from(deviceResetRequests).where(eq(deviceResetRequests.status, "pending")),
      db.select({ value: count() }).from(loginAttempts).where(and(eq(loginAttempts.success, false), sql`${loginAttempts.createdAt} > DATE_SUB(NOW(), INTERVAL 24 HOUR)`)),
    ]);
    return { products: productCount.value, licenses: licenseCount.value, activeCards: activeCount.value, pendingResets: resetCount.value, failedAttempts: failedCount.value };
  }),
  products: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return Object.entries(PRODUCT_META).map(([slug, meta], index) => ({ id: index + 1, slug, name: meta.name, type: meta.type, description: meta.description, status: "active", licenseCount: [84, 54, 62, 48][index] }));
    return db.select({ id: products.id, slug: products.slug, name: products.name, type: products.type, description: products.description, status: products.status }).from(products).orderBy(products.id);
  }),
  licenses: adminProcedure.input(z.object({ query: z.string().trim().max(80).optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return Object.values(DEMO_CARDS).map(card => ({ id: card.licenseId, licenseKey: `${card.slug.toUpperCase()}-DEMO`, product: card.name, status: "active", device: "Registered", createdAt: new Date() }));
    const rows = await db.select({ id: licenses.id, licenseKey: licenses.licenseKey, status: licenses.status, createdAt: licenses.createdAt, product: products.name }).from(licenses).innerJoin(products, eq(licenses.productId, products.id)).where(input?.query ? like(licenses.licenseKey, `%${input.query}%`) : undefined).orderBy(desc(licenses.createdAt)).limit(100);
    return rows.map(row => ({ ...row, device: "Managed device" }));
  }),
  resetRequests: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [{ id: 1, product: "Foreign Music", licenseKey: "FOREIGN-DEMO", requestedBy: "203.0.113.44", status: "pending", createdAt: new Date() }];
    return db.select({ id: deviceResetRequests.id, status: deviceResetRequests.status, reason: deviceResetRequests.reason, requestedBy: deviceResetRequests.requestedBy, createdAt: deviceResetRequests.createdAt, licenseKey: licenses.licenseKey, product: products.name }).from(deviceResetRequests).innerJoin(licenses, eq(deviceResetRequests.licenseId, licenses.id)).innerJoin(products, eq(licenses.productId, products.id)).orderBy(desc(deviceResetRequests.createdAt)).limit(100);
  }),
  resetDevice: adminProcedure.input(z.object({ requestId: z.number().int().positive(), approve: z.boolean(), note: z.string().max(500).optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return { ok: true, status: input.approve ? "approved" : "rejected" };
    const request = await db.select().from(deviceResetRequests).where(eq(deviceResetRequests.id, input.requestId)).limit(1);
    if (!request[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Reset request not found." });
    if (input.approve && request[0].deviceId) await db.update(deviceRegistrations).set({ status: "revoked", revokedAt: new Date() }).where(eq(deviceRegistrations.id, request[0].deviceId));
    await db.update(deviceResetRequests).set({ status: input.approve ? "approved" : "rejected", reviewedBy: ctx.user.id, adminNote: input.note ?? null }).where(eq(deviceResetRequests.id, input.requestId));
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: input.approve ? "device.reset.approved" : "device.reset.rejected", entityType: "device_reset_request", entityId: String(input.requestId), metadata: { note: input.note } });
    return { ok: true, status: input.approve ? "approved" : "rejected" };
  }),
  createLicenseCard: adminProcedure.input(z.object({ productSlug: productSlugSchema, password: passwordSchema })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return { ok: true, accessToken: `${input.productSlug.toUpperCase()}-DEMO01`, password: input.password };
    const product = await db.select().from(products).where(eq(products.slug, input.productSlug)).limit(1);
    if (!product[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
    const suffix = randomToken(5).toUpperCase();
    const licenseKey = `${input.productSlug.slice(0, 2).toUpperCase()}-${suffix}`;
    const license = await db.insert(licenses).values({ productId: product[0].id, licenseKey, passwordHash: hashSecret(input.password), status: "active" }).$returningId();
    const accessToken = `${input.productSlug.slice(0, 2).toUpperCase()}-${randomToken(9)}`;
    await db.insert(nfcCards).values({ productId: product[0].id, licenseId: license[0].id, nfcCode: licenseKey, accessToken, status: "assigned" });
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "license.created", entityType: "license", entityId: String(license[0].id), metadata: { productSlug: input.productSlug } });
    return { ok: true, accessToken, licenseKey, password: input.password };
  }),
  content: adminProcedure.input(z.object({ productSlug: productSlugSchema, contentType: contentTypeSchema, titleEn: z.string().min(2).max(240), titleAr: z.string().max(240).optional(), artistOrReciter: z.string().max(180).optional(), albumOrCategory: z.string().max(180).optional(), mediaUrl: z.string().url().optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return { ok: true };
    const product = await db.select().from(products).where(eq(products.slug, input.productSlug)).limit(1);
    if (!product[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
    await db.insert(contentItems).values({ productId: product[0].id, contentType: input.contentType, titleEn: input.titleEn, titleAr: input.titleAr, artistOrReciter: input.artistOrReciter, albumOrCategory: input.albumOrCategory, mediaUrl: input.mediaUrl, status: "published" });
    await db.insert(auditLogs).values({ actorUserId: ctx.user.id, action: "content.created", entityType: "content_item", metadata: { productSlug: input.productSlug, contentType: input.contentType } });
    return { ok: true };
  }),
});

export const appRouter = router({
  system: router({ health: publicProcedure.query(() => ({ status: "ok", service: "nfc-platform" })) }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  access: accessRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
