import type { MetadataRoute } from "next";

// מניפסט PWA (סעיף 13) – מאפשר הוספה למסך הבית, פתיחה במסך מלא, מיתוג ירוק.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "מחירון משקי דן - הדברה ודשן",
    short_name: "מחירון משקי דן",
    description: "מחירון חומרי הדברה ודשן של משקי דן",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f8f2",
    theme_color: "#1f7a3d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
