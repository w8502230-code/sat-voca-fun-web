import { StudyBatchMission } from "@/components/study-batch-mission";
import { appConfig } from "@/lib/config";
import { getThemeByDate, themeDetails } from "@/lib/theme";
import { getStudyBatches } from "@/lib/word-bank";

/** Batches must follow server "today"; static caching would desync marks from getDailyWords(occurredAt). */
export const dynamic = "force-dynamic";

export default function StudyPage() {
  const now = new Date();
  const theme = getThemeByDate(now);
  const themeMeta = themeDetails[theme];
  const batches = getStudyBatches(now);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold text-slate-100">{themeMeta.missionLabel}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        {themeMeta.welcomeBody}
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Mastery rule is already fixed: only marking &quot;remembered&quot; on flashcard updates
        mastered status.
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Loaded today: {batches.length} batches, {batches.flat().length} words.
      </p>

      <StudyBatchMission
        batches={batches}
        theme={theme}
        householdCode={appConfig.householdCode}
        learnerId={appConfig.learnerId}
      />
    </main>
  );
}
