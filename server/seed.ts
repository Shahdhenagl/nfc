import "dotenv/config";
import { eq } from "drizzle-orm";
import { contentItems, licenses, nfcCards, products } from "../drizzle/schema";
import { getDb } from "./db";
import { PRODUCT_META } from "@shared/constants";
import { hashSecret } from "./security";

const samples = {
  foreign: [
    ["song", "Midnight Radio", "راديو منتصف الليل", "Northline", "New releases"],
    ["song", "Slow Motion", "حركة بطيئة", "Luma", "Trending"],
    ["album", "Night Drive", "مشوار الليل", "Various artists", "Albums"],
  ],
  quran: [
    ["surah", "Al-Fatihah", "سورة الفاتحة", "Mishary Alafasy", "Surahs"],
    ["surah", "Yaseen", "سورة يس", "Abdul Basit", "Surahs"],
    ["zekr", "Morning Azkar", "أذكار الصباح", "Daily collection", "Morning"],
    ["zekr", "Evening Azkar", "أذكار المساء", "Daily collection", "Evening"],
  ],
  arabic: [
    ["song", "Layali Al-Tarab", "ليالي الطرب", "Demo Ensemble", "Tarab"],
    ["song", "Old City Lights", "أضواء المدينة القديمة", "Nile Quartet", "Classic Arabic"],
    ["album", "The Golden Archive", "الأرشيف الذهبي", "Various artists", "Oldies"],
  ],
  shaabi: [
    ["song", "Street Pulse", "نبض الشارع", "Demo Artist", "Mahraganat"],
    ["song", "Friday Crowd", "لمة الجمعة", "Demo Artist", "Popular"],
    ["song", "On Repeat", "على الإعادة", "Demo Artist", "Trending"],
  ],
} as const;

async function seed() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required for seed");
  for (const [slug, meta] of Object.entries(PRODUCT_META)) {
    const found = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    let productId = found[0]?.id;
    if (!productId) {
      const inserted = await db.insert(products).values({ slug, name: meta.name, type: meta.type, description: meta.description, status: "active" }).$returningId();
      productId = inserted[0].id;
    }
    const existing = await db.select().from(contentItems).where(eq(contentItems.productId, productId)).orderBy(contentItems.sortOrder);
    const mediaUrlFor = (index: number) => slug === "quran" && index < 2
      ? `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${index + 1}.mp3`
      : `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(index % 3) + 1}.mp3`;
    if (!existing.length) {
      const rows = (samples[slug as keyof typeof samples] || []).map(([contentType, titleEn, titleAr, artistOrReciter, albumOrCategory], index) => ({ productId, contentType, titleEn, titleAr, artistOrReciter, albumOrCategory, status: "published" as const, sortOrder: index, mediaUrl: mediaUrlFor(index), durationSeconds: 210 + index * 18 }));
      if (rows.length) await db.insert(contentItems).values(rows);
    } else {
      for (const [index, item] of existing.entries()) await db.update(contentItems).set({ mediaUrl: item.mediaUrl || mediaUrlFor(index), durationSeconds: item.durationSeconds || 210 + index * 18 }).where(eq(contentItems.id, item.id));
    }
    const demoPrefix = slug === "foreign" ? "FR" : slug === "quran" ? "QN" : slug === "arabic" ? "AR" : "SH";
    const licenseKey = `${slug.toUpperCase()}-DEMO`;
    const existingLicense = await db.select().from(licenses).where(eq(licenses.licenseKey, licenseKey)).limit(1);
    let licenseId = existingLicense[0]?.id;
    if (!licenseId) {
      const insertedLicense = await db.insert(licenses).values({ productId, licenseKey, passwordHash: hashSecret("demo1234"), status: "active" }).$returningId();
      licenseId = insertedLicense[0].id;
    }
    const accessToken = `${demoPrefix}-DEMO01`;
    const existingCard = await db.select({ id: nfcCards.id }).from(nfcCards).where(eq(nfcCards.accessToken, accessToken)).limit(1);
    if (!existingCard.length) await db.insert(nfcCards).values({ productId, licenseId, nfcCode: accessToken, accessToken, status: "assigned" });
  }
  console.log("[seed] products and content ready");
  process.exit(0);
}

seed().catch(error => { console.error(error); process.exit(1); });
