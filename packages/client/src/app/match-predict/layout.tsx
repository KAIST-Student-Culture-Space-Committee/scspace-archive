import { Exo_2, Noto_Sans_KR } from "next/font/google";
import type { ReactNode } from "react";

const bodyFont = Noto_Sans_KR({ subsets: ["latin"], variable: "--match-body-font", display: "swap" });
const numberFont = Exo_2({ subsets: ["latin"], style: ["normal", "italic"], variable: "--match-number-font", display: "swap" });

export default function MatchPredictLayout({ children }: { children: ReactNode }) {
    return <div className={`${bodyFont.variable} ${numberFont.variable}`} style={{ height: "100%", minHeight: 0, fontFamily: "var(--match-body-font), sans-serif" }}>{children}</div>;
}
