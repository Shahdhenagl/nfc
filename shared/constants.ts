export const PRODUCT_SLUGS = ["foreign", "quran", "arabic", "shaabi"] as const;
export type ProductSlug = (typeof PRODUCT_SLUGS)[number];

export type ProductType = "music" | "quran";
export const PRODUCT_META: Record<ProductSlug, {
  name: string;
  shortName: string;
  type: ProductType;
  accent: string;
  description: string;
}> = {
  foreign: {
    name: "Foreign Music",
    shortName: "Foreign",
    type: "music",
    accent: "copper",
    description: "A private shelf for new releases, chart favorites and the artists you keep close.",
  },
  quran: {
    name: "Quran & Azkar",
    shortName: "Quran",
    type: "quran",
    accent: "emerald",
    description: "A calm, focused space for Quran recitation, daily azkar and ruqyah.",
  },
  arabic: {
    name: "Arabic Music — Tarab & Art",
    shortName: "Arabic",
    type: "music",
    accent: "saffron",
    description: "Tarab, classics and Arabic voices curated as a private listening room.",
  },
  shaabi: {
    name: "Shaabi Music",
    shortName: "Shaabi",
    type: "music",
    accent: "rose",
    description: "Mahraganat, popular cuts and the songs making noise right now.",
  },
};

export const DEVICE_MISMATCH_EN = "This card is already activated on another device.";
export const DEVICE_MISMATCH_AR = "هذه البطاقة مفعلة بالفعل على جهاز آخر.";
export const ACCESS_COOKIE = "nfc_access_session";
export const DEVICE_COOKIE = "nfc_device_token";
export const ADMIN_ROLES = ["admin", "super_admin"] as const;
