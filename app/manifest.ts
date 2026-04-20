import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SAT Voca Fun",
    short_name: "SAT Voca",
    description: "SAT vocabulary learning web app with themed storytelling.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
