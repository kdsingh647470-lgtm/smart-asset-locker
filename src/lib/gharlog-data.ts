import type { LucideIcon } from "lucide-react";
import {
  Refrigerator,
  AirVent,
  Laptop,
  WashingMachine,
  Tv,
  Microwave,
  Smartphone,
  Lamp,
} from "lucide-react";

export type LifecycleStatus = "ok" | "warn" | "bad" | "na";

export type Item = {
  id: string;
  name: string;
  brand: string;
  serial: string;
  room: string;
  icon: LucideIcon;
  iconTone: "blue" | "teal" | "purple" | "amber" | "red";
  pricePaid: number;
  priceNow: number;
  purchasedAt: string;
  depreciationTone: "ok" | "warn" | "bad";
  badges: { label: string; tone: "ok" | "warn" | "bad" | "info" | "muted"; icon?: LucideIcon }[];
  lifecycle: {
    invoice: LifecycleStatus;
    warranty: LifecycleStatus;
    amc: LifecycleStatus;
    insured: LifecycleStatus;
    manual: LifecycleStatus;
  };
};

export const ROOMS = [
  { key: "all", label: "All", count: 34 },
  { key: "kitchen", label: "Kitchen", count: 9 },
  { key: "living", label: "Living room", count: 7 },
  { key: "bedroom", label: "Bedroom", count: 6 },
  { key: "office", label: "Office", count: 5 },
  { key: "utility", label: "Utility", count: 4 },
];

export const ITEMS: Item[] = [
  {
    id: "lg-fridge",
    name: "LG 340L Double Door Fridge",
    brand: "LG Electronics",
    serial: "GL-T372JES4",
    room: "kitchen",
    icon: Refrigerator,
    iconTone: "teal",
    pricePaid: 32000,
    priceNow: 24800,
    purchasedAt: "Oct 2022",
    depreciationTone: "ok",
    badges: [
      { label: "Warranty: 3.5 yr", tone: "ok" },
      { label: "Invoice", tone: "info" },
      { label: "AMC active", tone: "ok" },
    ],
    lifecycle: { invoice: "ok", warranty: "ok", amc: "ok", insured: "ok", manual: "ok" },
  },
  {
    id: "samsung-ac",
    name: "Samsung 1.5T WindFree AC",
    brand: "Samsung India",
    serial: "AR18TYHYBWK",
    room: "bedroom",
    icon: AirVent,
    iconTone: "purple",
    pricePaid: 38500,
    priceNow: 28000,
    purchasedAt: "Mar 2023",
    depreciationTone: "warn",
    badges: [
      { label: "Warranty: 9 mo", tone: "ok" },
      { label: "Service due", tone: "warn" },
    ],
    lifecycle: { invoice: "ok", warranty: "ok", amc: "warn", insured: "na", manual: "ok" },
  },
  {
    id: "dell-xps",
    name: "Dell XPS 15 9530",
    brand: "Dell India",
    serial: "DXPS155930K",
    room: "office",
    icon: Laptop,
    iconTone: "blue",
    pricePaid: 189000,
    priceNow: 112000,
    purchasedAt: "Apr 2023",
    depreciationTone: "bad",
    badges: [
      { label: "Warranty: 14 mo", tone: "ok" },
      { label: "Invoice", tone: "info" },
      { label: "ProSupport", tone: "muted" },
    ],
    lifecycle: { invoice: "ok", warranty: "ok", amc: "ok", insured: "ok", manual: "na" },
  },
  {
    id: "lg-washer",
    name: "LG FrontLoad Washer 8kg",
    brand: "LG Electronics",
    serial: "F4J6TMP8S",
    room: "utility",
    icon: WashingMachine,
    iconTone: "red",
    pricePaid: 52000,
    priceNow: 34000,
    purchasedAt: "Jun 2022",
    depreciationTone: "bad",
    badges: [
      { label: "Expires 12 days", tone: "bad" },
      { label: "AMC: ₹3,200/yr", tone: "muted" },
    ],
    lifecycle: { invoice: "ok", warranty: "bad", amc: "na", insured: "na", manual: "ok" },
  },
  {
    id: "sony-tv",
    name: 'Sony Bravia 55" OLED',
    brand: "Sony India",
    serial: "XR55A80L",
    room: "living",
    icon: Tv,
    iconTone: "blue",
    pricePaid: 145000,
    priceNow: 118000,
    purchasedAt: "May 2024",
    depreciationTone: "ok",
    badges: [
      { label: "Warranty: 2 yr", tone: "ok" },
      { label: "Invoice", tone: "info" },
    ],
    lifecycle: { invoice: "ok", warranty: "ok", amc: "na", insured: "ok", manual: "ok" },
  },
  {
    id: "ifb-otg",
    name: "IFB 30L Microwave OTG",
    brand: "IFB",
    serial: "30BRC2",
    room: "kitchen",
    icon: Microwave,
    iconTone: "amber",
    pricePaid: 18500,
    priceNow: 13200,
    purchasedAt: "Aug 2023",
    depreciationTone: "warn",
    badges: [
      { label: "Warranty: 11 mo", tone: "ok" },
      { label: "Invoice", tone: "info" },
    ],
    lifecycle: { invoice: "ok", warranty: "ok", amc: "na", insured: "na", manual: "ok" },
  },
];

export const ALERTS = [
  {
    tone: "bad" as const,
    title: "LG Washing Machine warranty expires in 12 days",
    body: "Enrol in AMC before expiry · ₹3,200/yr · or lose coverage",
  },
  {
    tone: "warn" as const,
    title: "Samsung AC quarterly service overdue",
    body: "Last serviced April 2024 · Book now before summer peak pricing",
  },
  {
    tone: "info" as const,
    title: "38 invoices found in your Gmail",
    body: "Amazon, Flipkart, Croma, Reliance Digital · Tap to import all",
  },
];

export const GMAIL_SOURCES = [
  { logo: "AMZ", name: "Amazon.in", latest: "Bosch mixer grinder · 15 Jun 2024", count: 14 },
  { logo: "FLK", name: "Flipkart", latest: "Prestige pressure cooker · 3 Jun 2024", count: 9 },
  { logo: "CRM", name: "Croma", latest: 'Sony Bravia 55" · 22 May 2024', count: 7 },
  { logo: "RLY", name: "Reliance Digital", latest: "Dell XPS 15 · 10 Apr 2024", count: 5 },
  { logo: "VJS", name: "Vijay Sales", latest: "LG washer 8kg · 15 Jun 2022", count: 3 },
];

export const LOCKER_CATEGORIES = [
  { name: "Invoices", count: "34 files", tone: "blue" },
  { name: "Warranties", count: "28 cards", tone: "teal" },
  { name: "Insurance", count: "3 policies", tone: "purple" },
  { name: "Manuals", count: "18 PDFs", tone: "amber" },
  { name: "Property docs", count: "Khata, deed, rent", tone: "red" },
  { name: "Personal IDs", count: "PAN, Aadhaar, passport", tone: "blue" },
  { name: "Vehicle docs", count: "RC, insurance, PUC", tone: "teal" },
  { name: "Medical records", count: "4 files", tone: "red" },
];

export const TIMELINE = [
  { dot: "ok", title: 'Sony Bravia 55" OLED delivered', sub: "Invoice auto-imported from Croma email · 22 May", state: "done" },
  { dot: "ok", title: "Samsung AC quarterly service", sub: "Filter cleaned, gas pressure checked · 2 Jun", state: "done" },
  { dot: "ok", title: "LG Washer warranty alert triggered", sub: "12 days remaining · WhatsApp sent · 15 Jun", state: "done" },
  { dot: "warn", title: "LG Washer warranty expires", sub: "Enrol AMC before 9 Jul to stay covered", state: "upcoming", when: "9 Jul · 12 days" },
  { dot: "warn", title: "Samsung AC next service due", sub: "Pre-book to avoid summer surge pricing", state: "upcoming", when: "15 Jul · 18 days" },
  { dot: "bad", title: "Home insurance renewal", sub: "HDFC ERGO policy · auto-renew or compare quotes", state: "upcoming", when: "1 Aug · 35 days" },
];

export const SUGGESTIONS = [
  "When does my AC warranty end?",
  "Which laptop has insurance?",
  "Kitchen total value?",
  "All Samsung items",
  "Service due this month?",
];

export const AI_REPLIES: Record<string, string> = {
  "when does my ac warranty end?":
    "Your **Samsung 1.5T WindFree AC** (Bedroom) warranty is valid until **March 2025** — about 9 months remaining. Note: quarterly service is currently overdue. Book now to keep the warranty valid.",
  "which laptop has insurance?":
    "Your **Dell XPS 15 9530** (Office) is covered under your HDFC ERGO policy. Coverage: ₹1,12,000 (current market value). Next renewal: 1 August 2024.",
  "kitchen total value?":
    "Your **kitchen** has 9 items totalling **₹1,82,400** at purchase price. Current market value (after depreciation): approximately **₹1,38,000**. Largest items: LG Fridge ₹32,000 · IFB OTG ₹18,500 · Bosch Mixer ₹8,500.",
  "all samsung items":
    "You have **3 Samsung products**:\n1. Samsung 1.5T Split AC — ₹38,500 · Bedroom\n2. Samsung 55\" The Frame TV — ₹89,000 · Living room\n3. Samsung Galaxy S24 — ₹74,999 · Personal\n\nTotal: ₹2,02,499 purchase value.",
  "service due this month?":
    "**2 items** need service in July:\n1. Samsung AC (Bedroom) — quarterly service overdue. Last done April 2024.\n2. Kent RO filter — replacement due in 18 days.\n\nWant me to find service providers near you?",
};

export const PARTNERS = [
  { logo: "HDFC ERGO", name: "HDFC ERGO Home Shield", desc: "Pre-fill policy with GharLog data · claim 3× faster · 12% premium discount" },
  { logo: "ICICI Lombard", name: "ICICI Lombard Home Cover", desc: "All-risk contents cover · serial no. from GharLog accepted as proof" },
  { logo: "Tata AIG", name: "Tata AIG Smart Home", desc: "15% discount for GharLog Pro · auto-claim via GharLog on theft or fire" },
  { logo: "Bajaj Allianz", name: "Bajaj Allianz Home Protect", desc: "Jewellery and electronics cover · one-tap claim using your GharLog vault" },
];

export function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export const ICON_TONE: Record<Item["iconTone"], string> = {
  blue: "bg-[oklch(0.94_0.04_255)] text-[oklch(0.36_0.13_255)]",
  teal: "bg-[oklch(0.94_0.05_165)] text-[oklch(0.38_0.1_165)]",
  purple: "bg-[oklch(0.94_0.05_290)] text-[oklch(0.4_0.13_290)]",
  amber: "bg-[oklch(0.95_0.06_85)] text-[oklch(0.42_0.1_70)]",
  red: "bg-[oklch(0.95_0.04_25)] text-[oklch(0.45_0.15_25)]",
};

export const LOCKER_TONE: Record<string, string> = {
  blue: "text-[oklch(0.36_0.13_255)]",
  teal: "text-[oklch(0.38_0.1_165)]",
  purple: "text-[oklch(0.4_0.13_290)]",
  amber: "text-[oklch(0.42_0.1_70)]",
  red: "text-[oklch(0.45_0.15_25)]",
};
