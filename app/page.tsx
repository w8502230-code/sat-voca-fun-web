import Link from "next/link";

import { appConfig } from "@/lib/config";
import { getThemeByDate, themeDetails, type ThemeId } from "@/lib/theme";

const today = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "full",
  timeZone: "UTC",
});

export default function Home() {
  const activeTheme = getThemeByDate(new Date());
  const theme = themeDetails[activeTheme];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-sm text-slate-300">{today.format(new Date())}</p>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30 backdrop-blur sm:p-8">
          <div className="mb-4 inline-flex rounded-full border border-emerald-600/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            Active Theme: {theme.shortName}
          </div>
          <h1 className="text-2xl font-semibold leading-tight text-slate-100 sm:text-3xl">
            {theme.welcomeTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            {theme.welcomeBody}
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Household code: <span className="font-semibold">{appConfig.householdCode}</span>
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card
            title="Start Today Mission"
            body="Begin the 50-word daily mission with 5 batches and quick checks."
            href="/study"
            cta="Enter Study"
            theme={activeTheme}
          />
          <Card
            title="Daily Quiz"
            body="Run the daily quiz after batches, or anytime to track accuracy."
            href="/quiz?scope=daily"
            cta="Open Quiz"
            theme={activeTheme}
          />
          <Card
            title="Review Queue"
            body="Open 1/3/7 spaced review missions unlocked after full daily completion."
            href="/review"
            cta="Open Review"
            theme={activeTheme}
          />
          <Card
            title="Progress Panel"
            body="Track today's progress and historical mastered words across all devices."
            href="/result"
            cta="View Stats"
            theme={activeTheme}
          />
          <Card
            title="PWA Setup"
            body="Install to home screen on iPhone/iPad/Desktop for faster access."
            href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable"
            cta="Install Guide"
            external
            theme={activeTheme}
          />
          <Card
            title="Ops Quick Panel"
            body="Check deployment commit, environment info, and API quick links after each release."
            href="/ops"
            cta="Open Ops"
            theme={activeTheme}
          />
        </section>
      </main>
    </div>
  );
}

type CardProps = {
  title: string;
  body: string;
  href: string;
  cta: string;
  external?: boolean;
  theme: ThemeId;
};

function Card({ title, body, href, cta, external, theme }: CardProps) {
  const themeClass = theme === "hp_slytherin" ? "home-card-hp" : "home-card-r99";
  const cardClass =
    `home-mystic-card ${themeClass} rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition`;

  if (external) {
    return (
      <a className={cardClass} href={href} target="_blank" rel="noreferrer">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
        <p className="mt-4 text-sm font-medium text-emerald-300">{cta} &rarr;</p>
      </a>
    );
  }

  return (
    <Link className={cardClass} href={href}>
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
      <p className="mt-4 text-sm font-medium text-emerald-300">{cta} &rarr;</p>
    </Link>
  );
}
