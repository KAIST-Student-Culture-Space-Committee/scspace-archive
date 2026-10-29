import type { ReactNode } from "react";

const keyframes = `
@keyframes mt-flicker { 0%,100% { opacity: 1; filter: drop-shadow(0 0 12px #ff8a1a); } 40% { opacity: .75; filter: drop-shadow(0 0 4px #ff8a1a); } 70% { opacity: .9; } }
@keyframes mt-heartbeat { 0%,100% { transform: scale(1); } 15% { transform: scale(1.18); } 30% { transform: scale(1); } 45% { transform: scale(1.1); } }
@keyframes mt-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
`;

export default function MtLayout({ children }: { children: ReactNode }) {
    return <>
        <style>{keyframes}</style>
        {children}
    </>;
}
