import type { MetadataRoute } from "next";

/**
 * Lets a phone host "Add to Home Screen" and run the party full-screen, with no
 * browser chrome in the way of the game.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PARTYVERSE 派對遊戲",
    short_name: "PARTYVERSE",
    description: "一支手機就能開局的多人派對遊戲，不用電視或投影機。",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050508",
    theme_color: "#050508",
    lang: "zh-Hant",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
