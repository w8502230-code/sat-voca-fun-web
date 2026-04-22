import type { ThemeId } from "@/lib/theme";

/**
 * Theme images live under `public/themes/` (served as `/themes/...`).
 * Keep one canonical file per mark here so builds and deploys stay stable.
 */
type ThemePublicAssets = {
  hp_slytherin: { studyMark: string };
  reverse_1999: { studyMark: string };
};

export const themePublicAssets: ThemePublicAssets = {
  hp_slytherin: {
    studyMark: "/themes/slytherin-crest.svg",
  },
  reverse_1999: {
    studyMark: "/themes/reverse-1999-sigil.svg",
  },
};

export function getStudyThemeMarkSrc(theme: ThemeId): string {
  return themePublicAssets[theme].studyMark;
}
