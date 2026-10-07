"use client"

import React from "react";
import { useAuth } from "@scspace-client/Hooks/auth";
import PageSelector, { IPage } from "../../molecules/page/PageSelector";
import ManageUser from "./ManageUser";
import ManageSeminarLottery from "./Lottery/Seminar";
import ManagePerformanceLottery from "./Lottery/Performance";
import MatchPredictions from "./MatchPredictions";

export default function Administration() {
    const { needAdmin } = useAuth();
    needAdmin();

    const pages: IPage[] = [
        {
            kor: "유저 관리",
            eng: "Manage user",
            preview: <ManageUser />,
            href: "/admin/user"
        },
        {
            kor: "세미나실 정기예약 추첨 관리",
            eng: "Seminar Lottery Management",
            preview: <ManageSeminarLottery />,
            href: "/admin/lottery"
        },
        {
            kor: "공연집중기간 추첨 관리",
            eng: "Performance Lottery Management",
            preview: <ManagePerformanceLottery />,
            href: "/admin/lottery"
        },
        {
            kor: "단체관람 승부예측 관리",
            eng: "Match Prediction Leaderboard",
            preview: <MatchPredictions />,
            href: "/admin/match-prediction"
        }
    ]

    return (
        <PageSelector
            pages={pages}
        />
    );
}
