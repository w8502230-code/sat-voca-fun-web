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
    // Lock to user-provided original file.
    studyMark: "/themes/slytherin-crest.png",
    fallbackStudyMark: "/themes/slytherin-crest.png",
  },
  reverse_1999: {
    // Lock to user-provided original file.
    studyMark: "/themes/reverse-1999.jpg",
    fallbackStudyMark: "/themes/reverse-1999.jpg",
  },
};

export function getStudyThemeMarkSrc(theme: ThemeId): string {
  return themePublicAssets[theme].studyMark;
}

export function getStudyThemeMarkFallbackSrc(theme: ThemeId): string {
  return themePublicAssets[theme].fallbackStudyMark;
}
