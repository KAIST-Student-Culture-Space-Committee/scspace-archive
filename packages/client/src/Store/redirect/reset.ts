"use client";

import { useAllSpace } from "@scspace-client/Hooks/space";
import { useEffect, useState } from "react";
import { IRedirect, useRedirectStore } from ".";
import { useAuth } from "@scspace-client/Hooks/auth";
import { usePerformanceLotteryInfoAPI, useSeminarLotteryInfoAPI } from "@scspace-client/Hooks/lottery";
import { usePathname } from "next/navigation";

export function useRedirects() {
    const { spaces } = useAllSpace();
    const [spaceLinks, setSpaceLinks] = useState<IRedirect[]>([]);
    const [calendarLinks, setCalendarLinks] = useState<IRedirect[]>([]);
    const { isAdmin, isManager, isLogined, isWorker, isPasspinMaster } = useAuth();
    const pathname = usePathname();

    useEffect(() => {
        if (spaces) setSpaceLinks(spaces.map((s): IRedirect => {
            return {
                href: `/browse/space/${s.id}`,
                helperText: s.nameEn,
                label: s.nameKr,
            }
        }))
    }, [spaces]);

    useEffect(() => {
        if (spaces) setCalendarLinks(
            spaces.map((s): IRedirect => ({
                href: `/reservation/status/${s.id}`,
                helperText: s.nameEn,
                label: s.nameKr,
            }))
        )
    }, [spaces]);

    const { update } = useRedirectStore();

    const {
        data: activeSeminarLotteryInfo,
        refetch: refetchActiveSeminarLotteryInfo
    } = useSeminarLotteryInfoAPI().activeLotteryInfo;

    const {
        data: activePerformanceLotteryInfo,
        refetch: refetchActivePerformanceLotteryInfo
    } = usePerformanceLotteryInfoAPI().activeLotteryInfo;

    useEffect(() => {
        refetchActiveSeminarLotteryInfo();
        refetchActivePerformanceLotteryInfo();
    }, [pathname, refetchActivePerformanceLotteryInfo, refetchActiveSeminarLotteryInfo]);

    useEffect(() => {
        update([
            {
                href: "/lottery-seminar",
                label: "세미나실 정기예약 추첨",
                helperText: "Seminar-room Lottery",
                invisible: !isLogined || !activeSeminarLotteryInfo || activeSeminarLotteryInfo.length === 0 || activeSeminarLotteryInfo[0].applied,
            },
            {
                href: "/lottery-performance",
                label: "공연집중기간 추첨",
                helperText: "Performance Period Lottery",
                invisible: !isLogined || !activePerformanceLotteryInfo || activePerformanceLotteryInfo.length === 0 || activePerformanceLotteryInfo[0].applied,
            },
            {
                href: "/browse",
                label: "찾아보기",
                helperText: "Browse",
                subdomains: [
                    {
                        href: "/browse/archive",
                        label: "자료실",
                        helperText: "Archive",
                    },
                    {
                        href: "/browse/space",
                        label: "공간",
                        helperText: "Spaces",
                        subdomains: spaceLinks,
                    },
                    {
                        href: '/browse/rules',
                        label: "세칙",
                        helperText: "Rules"
                    }
                ]
            },
            {
                href: "/article",
                label: "게시판",
                helperText: "Article",
            },
            {
                href: "/organization",
                label: "조직",
                helperText: "Organization",
                subdomains: [
                    {
                        href: "/organization/verified",
                        label: "인증된 조직",
                        helperText: "Verified Organization"
                    },
                    {
                        href: "/mypage/organization",
                        label: "내 조직",
                        helperText: "My Organization",
                        invisible: !isLogined,
                    },
                ]
            },
            {
                href: "/reservation",
                label: "예약",
                helperText: "Reservation",
                subdomains: [
                    {
                        href: "/reservation/application",
                        label: "신청",
                        helperText: "Application",
                        invisible: !isLogined,
                    },
                    {
                        href: "/reservation/status",
                        label: "현황",
                        helperText: "Status",
                        subdomains: calendarLinks
                    },
                    {
                        href: "/reservation/worker",
                        label: "근로 신청 예약",
                        helperText: "Reservation needs Worker",
                        invisible: !isWorker
                    },
                    {
                        href: "/mypage/reservation",
                        label: "내 예약",
                        helperText: "My Reservation",
                        invisible: !isLogined,
                    },
                ]
            },
            {
                href: "/rental",
                label: "대여",
                helperText: "Rental",
                subdomains: [
                    {
                        href: "/rental/application",
                        label: isLogined ? "대여 신청" : "대여 품목",
                        helperText: isLogined ? "Rental Application" : "Goods List",
                    },
                    {
                        href: "/mypage/rental",
                        label: "내 대여",
                        helperText: "My Rental",
                        invisible: !isLogined,
                    }
                ]
            },
            {
                href: "/manage",
                label: "관리",
                helperText: "Management",
                invisible: !isManager,
                subdomains: [
                    {
                        href: "/manage/organization",
                        label: "조직",
                        helperText: "Organization"
                    },
                    {
                        href: "/manage/reservation",
                        label: "예약",
                        helperText: "Reservation"
                    },
                    {
                        href: "/manage/rental",
                        label: "대여",
                        helperText: "Rental"
                    }
                ]
            },
            {
                href: "/admin",
                label: "운영",
                helperText: "Administration",
                invisible: !isAdmin,
                subdomains: [
                    {
                        href: "/admin/user",
                        label: "유저 관리",
                        helperText: "Manage User"
                    },
                    {
                        href: "/admin/match-prediction",
                        label: "승부예측 대시보드",
                        helperText: "Match Prediction Dashboard"
                    },
                    {
                        href: "/admin/lottery-seminar",
                        label: "세미나실 정기예약 추첨 관리",
                        helperText: "Seminar Lottery Management"
                    },
                    {
                        href: "/admin/lottery-performance",
                        label: "공연집중기간 추첨 관리",
                        helperText: "Performance Lottery Management"
                    }
                ]
            },
            {
                href: "/dev",
                label: "개발",
                helperText: "Development",
                invisible: !isAdmin,
            },
            {
                href: "/passpin",
                label: "비밀번호 관리",
                helperText: "Passpin Management",
                invisible: !isPasspinMaster,
            },
        ]);
    }, [
        activePerformanceLotteryInfo,
        activeSeminarLotteryInfo,
        calendarLinks,
        isAdmin,
        isLogined,
        isManager,
        isPasspinMaster,
        isWorker,
        spaceLinks,
        update,
    ]);
}
