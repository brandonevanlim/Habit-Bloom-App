export const SHOP_ITEMS = [
  { id: "default",    name: "Sprout",       emoji: "🌱", cost: 0,   kind: "Skin"  },
  { id: "hat-leaf",   name: "Leaf hat",     emoji: "🌿", cost: 30,  kind: "Hat"   },
  { id: "hat-party",  name: "Party hat",    emoji: "🎉", cost: 45,  kind: "Hat"   },
  { id: "bg-meadow",  name: "Meadow",       emoji: "🌼", cost: 60,  kind: "Theme" },
  { id: "pet-bunny",  name: "Bunny pal",    emoji: "🐰", cost: 80,  kind: "Pet"   },
  { id: "hat-crown",  name: "Royal crown",  emoji: "👑", cost: 150, kind: "Hat"   },
  { id: "bg-space",   name: "Cosmic",       emoji: "🌌", cost: 200, kind: "Theme" },
  { id: "pet-dragon", name: "Tiny dragon",  emoji: "🐲", cost: 250, kind: "Pet"   },
] as const;

export type ShopItem = (typeof SHOP_ITEMS)[number];
