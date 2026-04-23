import Link from "next/link";

import { appConfig } from "@/lib/config";

const shortSha = (sha?: string) => (sha ? sha.slice(0, 7) : "local-dev");

export default function OpsPage() {
  const inspectLinks = [
    { label: "Theme API", href: "/api/theme/current" },
    {
      label: "Progress Summary API",
      href: `/api/progress/summary?householdCode=${encodeURIComponent(appConfig.householdCode)}&learnerId=${encodeURIComponent(appConfig.learnerId)}`,
    },
    { label: "Daily Plan API", href: "/api/daily-plan" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30 backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Ops Panel</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-100 sm:text-3xl">
            Deployment and Runtime Snapshot
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Use this page to confirm deployed commit, environment, and API reachability without opening
            CLI tools.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <InfoCard label="Vercel Environment" value={process.env.VERCEL_ENV ?? "local-dev"} />
          <InfoCard label="Current Commit" value={shortSha(process.env.VERCEL_GIT_COMMIT_SHA)} />
          <InfoCard label="Deployment URL" value={process.env.VERCEL_URL ?? "not-set"} />
          <InfoCard label="Household Code" value={appConfig.householdCode} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30 backdrop-blur sm:p-8">
          <h2 className="text-lg font-semibold text-slate-100">Quick Checks</h2>
          <p className="mt-2 text-sm text-slate-300">
            Open these endpoints after each deploy to quickly verify API health.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {inspectLinks.map((link) => (
              <a
                key={link.label}
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-emerald-300 transition hover:border-emerald-500/40"
                href={link.href}
                target="_blank"
                rel="noreferrer"
              >
                {link.label} &rarr;
              </a>
            ))}
          </div>
          <div className="mt-6">
            <Link className="text-sm font-medium text-slate-300 hover:text-slate-100" href="/">
              &larr; Back to home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-slate-100">{value}</p>
    </article>
  );
}
