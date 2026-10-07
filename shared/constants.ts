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
    name: "الموسيقى الأجنبية",
    shortName: "أجنبية",
    type: "music",
    accent: "copper",
    description: "مكتبة خاصة للإصدارات الجديدة والأغاني المفضلة والفنانين الذين تحبهم.",
  },
  quran: {
    name: "القرآن والأذكار",
    shortName: "القرآن",
    type: "quran",
    accent: "emerald",
    description: "مساحة هادئة للتلاوات القرآنية والأذكار اليومية والرقية الشرعية.",
  },
  arabic: {
    name: "الموسيقى العربية — الطرب والفن",
    shortName: "عربية",
    type: "music",
    accent: "saffron",
    description: "الطرب والكلاسيكيات وأجمل الأصوات العربية في مكتبة استماع خاصة.",
  },
  shaabi: {
    name: "الموسيقى الشعبي",
    shortName: "شعبي",
    type: "music",
    accent: "rose",
    description: "مهرجانات وأغاني شعبية وأحدث ما يستمع إليه الناس الآن.",
  },
};

export const DEVICE_MISMATCH_EN = "This card is already activated on another device.";
export const DEVICE_MISMATCH_AR = "هذه البطاقة مفعلة بالفعل على جهاز آخر.";
export const ACCESS_COOKIE = "nfc_access_session";
export const DEVICE_COOKIE = "nfc_device_token";
export const ADMIN_ROLES = ["admin", "super_admin"] as const;
