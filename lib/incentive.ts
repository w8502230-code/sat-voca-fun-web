import type { ThemeId } from "@/lib/theme";

/** Theme labels for PRD 4.7 incentive copy */
export const incentiveLabels = {
  hp_slytherin: {
    pointsName: "House Points",
    badgeName: "House Badge",
    eggHint: "Easter egg",
  },
  reverse_1999: {
    pointsName: "Arcane Energy",
    badgeName: "Foundation Medal",
    eggHint: "Hidden archive note",
  },
} as const;

export type CompletionBadge = {
  id: string;
  title: string;
  subtitle: string;
};

/** Visual tier from this quiz attempt (shown every time). */
export function getCompletionBadge(theme: ThemeId, accuracyPercent: number): CompletionBadge | null {
  if (accuracyPercent >= 100) {
    return theme === "hp_slytherin"
      ? {
          id: "hp-perfect",
          title: "Salazar's Laurel",
          subtitle: "Perfect round — the dungeon lamps shine a little brighter.",
        }
      : {
          id: "r99-perfect",
          title: "Storm-Safe Seal",
          subtitle: "Perfect round — the timeline holds steady.",
        };
  }
  if (accuracyPercent >= 85) {
    return theme === "hp_slytherin"
      ? {
          id: "hp-merit",
          title: "Dungeon Merit",
          subtitle: "Strong focus — your spellbook notes are in order.",
        }
      : {
          id: "r99-ribbon",
          title: "Archive Ribbon",
          subtitle: "Clean run — the Foundation files this with approval.",
        };
  }
  if (accuracyPercent >= 60) {
    return theme === "hp_slytherin"
      ? {
          id: "hp-study",
          title: "Study Galleon",
          subtitle: "Solid effort — keep pressing the lexicon.",
        }
      : {
          id: "r99-rune",
          title: "Rune Chip",
          subtitle: "Good pace — the storm has not breached the archive.",
        };
  }
  return null;
}

export function getCompletionEggLine(theme: ThemeId, accuracyPercent: number): string | null {
  if (accuracyPercent < 100) return null;
  return theme === "hp_slytherin"
    ? "A silver thread glints on the crest — rumor says Salazar smiled once."
    : "A faint hum from the 1999 barrier — the archive whispers 'well done'.";
}

/** Server-side points for first completion of a scope on a given UTC day. */
export function computeQuizPointsEarned(correct: number, total: number): number {
  if (total === 0) return 0;
  const base = correct * 6;
  const ratio = correct / total;
  const bonus = ratio >= 1 ? 24 : ratio >= 0.85 ? 10 : ratio >= 0.6 ? 4 : 0;
  return base + bonus;
}
