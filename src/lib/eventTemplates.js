export const EVENT_TEMPLATES = {
  "anak-sekolah": {
    nama: "Anak Masuk Sekolah",
    icon: "GraduationCap",
    color: "#5069cc",
    defaultDuration: 60,
    subCategories: [
      { kategori: "Uang Pangkal", limit: 2000000, icon: "Landmark", urutan: 1 },
      { kategori: "Seragam", limit: 1200000, icon: "Shirt", urutan: 2 },
      { kategori: "Buku & Alat Tulis", limit: 800000, icon: "BookOpen", urutan: 3 },
      { kategori: "SPP / Uang Sekolah", limit: 1500000, icon: "CreditCard", urutan: 4 },
      { kategori: "Transportasi Sekolah", limit: 500000, icon: "Bus", urutan: 5 },
      { kategori: "Lainnya", limit: 500000, icon: "MoreHorizontal", urutan: 6 },
    ],
    categoryHints: {
      "Pakaian": "Seragam",
      "Ilmu": "Buku & Alat Tulis",
      "Transportasi": "Transportasi Sekolah",
      "Belanja": "Buku & Alat Tulis",
    },
  },
  "lebaran-thr": {
    nama: "Lebaran / THR",
    icon: "Moon",
    color: "#d4a853",
    defaultDuration: 30,
    subCategories: [
      { kategori: "Zakat Fitrah", limit: 500000, icon: "Heart", urutan: 1 },
      { kategori: "Amplop / THR", limit: 2000000, icon: "Gift", urutan: 2 },
      { kategori: "Kue & Makanan Lebaran", limit: 1000000, icon: "Cookie", urutan: 3 },
      { kategori: "Pakaian Lebaran", limit: 1500000, icon: "Shirt", urutan: 4 },
      { kategori: "Transportasi Mudik", limit: 2000000, icon: "Car", urutan: 5 },
      { kategori: "Dekorasi & Parsel", limit: 500000, icon: "Home", urutan: 6 },
      { kategori: "Lainnya", limit: 500000, icon: "MoreHorizontal", urutan: 7 },
    ],
    categoryHints: {
      "Sedekah": "Zakat Fitrah",
      "Pakaian": "Pakaian Lebaran",
      "Transportasi": "Transportasi Mudik",
      "Makan di luar": "Kue & Makanan Lebaran",
      "Makan di rumah": "Kue & Makanan Lebaran",
    },
    hasTHR: true,
  },
}

export const EVENT_TEMPLATE_LIST = Object.entries(EVENT_TEMPLATES).map(([key, t]) => ({
  key,
  nama: t.nama,
  icon: t.icon,
  color: t.color,
  subCategoryCount: t.subCategories.length,
}))

export function getTemplate(key) {
  return EVENT_TEMPLATES[key] || null
}

export function getDefaultSubCategories(templateKey) {
  const t = EVENT_TEMPLATES[templateKey]
  return t ? t.subCategories : []
}
