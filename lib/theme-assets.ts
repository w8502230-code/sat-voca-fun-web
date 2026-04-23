import type { ThemeId } from "@/lib/theme";

/**
 * Theme images live under `public/themes/` (served as `/themes/...`).
 * Keep one canonical file per mark here so builds and deploys stay stable.
 */
type ThemePublicAssets = {
  hp_slytherin: { studyMark: string; fallbackStudyMark: string };
  reverse_1999: { studyMark: string; fallbackStudyMark: string };
};

export const themePublicAssets: ThemePublicAssets = {
  hp_slytherin: {
    studyMark: "/themes/slytherin-crest.svg",
    fallbackStudyMark: "/themes/slytherin-crest.svg",
  },
  reverse_1999: {
    // Use committed canonical asset to avoid preview/prod mismatch.
    studyMark: "/themes/reverse-1999-sigil.svg",
    fallbackStudyMark: "/themes/reverse-1999-sigil.svg",
  },
};

export function getStudyThemeMarkSrc(theme: ThemeId): string {
  return themePublicAssets[theme].studyMark;
}

export function getStudyThemeMarkFallbackSrc(theme: ThemeId): string {
  return themePublicAssets[theme].fallbackStudyMark;
}
