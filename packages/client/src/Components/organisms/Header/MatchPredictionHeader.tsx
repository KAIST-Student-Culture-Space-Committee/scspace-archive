"use client"

import Header from "@scspace-client/Components/organisms/Header";
import {usePathname} from 'next/navigation';

export default function MatchPredictionHeader() {
    const pathname = usePathname();
    if (pathname.startsWith('/match-prediction')) return null;
    return <Header />;
}