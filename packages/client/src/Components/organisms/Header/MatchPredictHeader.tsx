"use client"

import Header from "@scspace-client/Components/organisms/Header";
import {usePathname} from 'next/navigation';

export default function MatchPredictHeader() {
    const pathname = usePathname();
    if (pathname.startsWith('/match-predict')) return null;
    return <Header />;
}