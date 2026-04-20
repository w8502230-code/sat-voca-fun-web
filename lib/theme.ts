import { appConfig } from "@/lib/config";

export type ThemeId = "hp_slytherin" | "reverse_1999";

export const themeDetails: Record<
  ThemeId,
  {
    shortName: string;
    welcomeTitle: string;
    welcomeBody: string;
    missionLabel: string;
    cardAccent: string;
    cardBackdrop: string;
    rememberedLabel: string;
    forgottenLabel: string;
    flipFrontLabel: string;
    flipBackLabel: string;
    flipHint: string;
    flipBackHint: string;
  }
> = {
  hp_slytherin: {
    shortName: "Slytherin",
    welcomeTitle: "Welcome to the Slytherin Study Chamber",
    welcomeBody:
      "Today's SAT mission begins at Hogwarts. Mark each remembered word to strengthen your spellbook.",
    missionLabel: "Hogwarts Lexicon Quest",
    cardAccent: "Emerald and Silver",
    cardBackdrop: "Dungeon Lamp Glow",
    rememberedLabel: "Spell Mastered",
    forgottenLabel: "Needs Recasting",
    flipFrontLabel: "Spell Card Front",
    flipBackLabel: "Spell Card Back",
    flipHint: "Tap to reveal the spell notes",
    flipBackHint: "Tap to return to the spell name",
  },
  reverse_1999: {
    shortName: "Timekeeper",
    welcomeTitle: "Welcome Back, Timekeeper",
    welcomeBody:
      "The Foundation awaits your daily rune analysis. Complete today's SAT mission to stabilize the timeline.",
    missionLabel: "Foundation Rune Briefing",
    cardAccent: "Antique Gold and Deep Green",
    cardBackdrop: "Storm Archive Haze",
    rememberedLabel: "Rune Decoded",
    forgottenLabel: "Needs Re-analysis",
    flipFrontLabel: "Rune Card Front",
    flipBackLabel: "Rune Card Back",
    flipHint: "Tap to inspect archive details",
    flipBackHint: "Tap to return to rune tag",
  },
};

const MS_PER_DAY = 86_400_000;

export const getThemeByDate = (input: Date): ThemeId => {
  const start = new Date(`${appConfig.rotationStartDate}T00:00:00.000Z`);
  const normalizedInput = new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
  );
  const diffDays = Math.floor((normalizedInput.getTime() - start.getTime()) / MS_PER_DAY);
  const cycleDay = ((diffDays % 10) + 10) % 10;
  return cycleDay <= 4 ? "hp_slytherin" : "reverse_1999";
};
