import { QuizSession } from "@/components/quiz-session";
import { appConfig } from "@/lib/config";
import { getThemeByDate, themeDetails } from "@/lib/theme";

type Props = {
  searchParams: Promise<{ scope?: string; batch?: string }>;
};

export default async function QuizPage({ searchParams }: Props) {
  const params = await searchParams;
  const scope =
    params.scope === "batch" || params.scope === "wrong" || params.scope === "daily"
      ? params.scope
      : "daily";
  const batch = params.batch ? Number(params.batch) : undefined;
  const now = new Date();
  const theme = getThemeByDate(now);
  const themeMeta = themeDetails[theme];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold text-slate-100">{themeMeta.missionLabel} Quiz</h1>
      <p className="mt-2 text-sm text-slate-300">
        Complete quizzes to track accuracy and build your wrong-word retry queue.
      </p>
      <QuizSession
        householdCode={appConfig.householdCode}
        learnerId={appConfig.learnerId}
        scope={scope}
        batch={batch}
        theme={theme}
      />
    </main>
  );
}
