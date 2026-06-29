import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  Box,
  ShieldCheck,
  Bell,
  CalendarClock,
  ScanLine,
  Camera,
  MailPlus,
  Lock,
  HeartPulse,
  ChevronRight,
  ChevronLeft,
  HomeIcon,
} from "lucide-react";
import { markOnboardingSeen } from "@/lib/onboarding-storage";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — GharLog" },
      {
        name: "description",
        content:
          "Quick tour of GharLog — how to scan, store and track every home asset, warranty and document.",
      },
      { property: "og:title", content: "Get started with GharLog" },
      {
        property: "og:description",
        content:
          "Quick tour of GharLog — how to scan, store and track every home asset, warranty and document.",
      },
      { property: "og:url", content: "https://smart-asset-locker.lovable.app/onboarding" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://smart-asset-locker.lovable.app/onboarding" }],
  }),
  component: OnboardingPage,
});

type Slide = {
  icon: React.ReactNode;
  title: string;
  body: string;
  bg: string;
};

const SLIDES: Slide[] = [
  {
    icon: (
      <div className="flex gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.94_0.04_255)] text-[oklch(0.36_0.13_255)]">
          <Home className="h-7 w-7" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.94_0.05_165)] text-[oklch(0.38_0.1_165)]">
          <Box className="h-7 w-7" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.94_0.05_290)] text-[oklch(0.4_0.13_290)]">
          <ShieldCheck className="h-7 w-7" />
        </div>
      </div>
    ),
    title: "Track everything you own",
    body: "From appliances and gadgets to warranties, invoices and insurance — keep every home asset in one place.",
    bg: "bg-surface-0",
  },
  {
    icon: (
      <div className="flex gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.95_0.04_25)] text-[oklch(0.45_0.15_25)]">
          <Bell className="h-7 w-7" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.95_0.06_85)] text-[oklch(0.42_0.1_70)]">
          <CalendarClock className="h-7 w-7" />
        </div>
      </div>
    ),
    title: "Never miss a renewal",
    body: "Get automatic alerts 30, 7 and 1 day before warranty, AMC or insurance expires. Book service before the rush.",
    bg: "bg-surface-0",
  },
  {
    icon: (
      <div className="flex gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.94_0.04_255)] text-[oklch(0.36_0.13_255)]">
          <ScanLine className="h-7 w-7" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.94_0.07_158)] text-[oklch(0.38_0.13_158)]">
          <Camera className="h-7 w-7" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.94_0.05_165)] text-[oklch(0.38_0.1_165)]">
          <MailPlus className="h-7 w-7" />
        </div>
      </div>
    ),
    title: "Scan invoices in seconds",
    body: "Snap a photo or import from Gmail. GharLog reads the brand, price and warranty dates and builds your vault automatically.",
    bg: "bg-surface-0",
  },
  {
    icon: (
      <div className="flex gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.94_0.05_290)] text-[oklch(0.4_0.13_290)]">
          <Lock className="h-7 w-7" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[oklch(0.95_0.04_25)] text-[oklch(0.45_0.15_25)]">
          <HeartPulse className="h-7 w-7" />
        </div>
      </div>
    ),
    title: "Your encrypted vault",
    body: "Invoices, property deeds, medical records and vehicle papers — all encrypted and always within reach.",
    bg: "bg-surface-0",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  function next() {
    if (isLast) {
      markOnboardingSeen();
      navigate({ to: "/" });
    } else {
      setIndex((i) => i + 1);
    }
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const slide = SLIDES[index];

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-surface-0 shadow-sm md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-2xl md:overflow-hidden">
        <header className="flex items-center justify-between bg-brand px-4 py-3 text-brand-foreground">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-blue">
              <HomeIcon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <h1 className="text-[17px] font-medium tracking-tight">GharLog</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              markOnboardingSeen();
              navigate({ to: "/" });
            }}
            className="text-[13px] text-white/70 hover:text-white"
          >
            Skip
          </button>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-8">{slide.icon}</div>

          <h2 className="mb-3 text-[22px] font-semibold leading-tight text-text-primary">
            {slide.title}
          </h2>
          <p className="max-w-[280px] text-[14px] leading-relaxed text-text-muted">
            {slide.body}
          </p>
        </main>

        <footer className="px-6 pb-8 pt-4">
          <div className="mb-6 flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-brand" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {index > 0 && (
              <button
                type="button"
                onClick={prev}
                aria-label="Previous slide"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-secondary"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-medium text-[15px] transition-colors ${
                isLast
                  ? "bg-brand text-brand-foreground"
                  : "bg-brand text-brand-foreground"
              }`}
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
