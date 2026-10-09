"use client"

import PageSelector, { IPage } from "../../molecules/page/PageSelector";
import UserOrganization from "./UserOrganization";
import UserRental from "./UserRental";
import UserPenalty from "./UserPenalty";
import UserReservation from "./UserReservation";
import { useAuth } from "@scspace-client/Hooks/auth";
import WorkHistory from "./WorkHistory";

export default function Mypage() {
  const { needLogin, isWorker } = useAuth();
  needLogin();

  const pages: IPage[] = [
    {
      kor: "예약 목록",
      eng: "Reservation List",
      preview: (<UserReservation />),
      href: "/mypage/reservation"
    },
    {
      kor: "조직 관리",
      eng: "Organization",
      preview: (<UserOrganization />),
      href: "/mypage/organization"
    },
    {
      kor: "대여 목록",
      eng: "Rental List",
      preview: (<UserRental />),
      href: "/mypage/rental"
    },
    {
      kor: "페널티",
      eng: "Penalty",
      preview: (<UserPenalty />),
      href: "/mypage/penalty"
    },
    {
      kor: "근로 기록",
      eng: "Work History",
      preview: (<WorkHistory />),
      href: "/mypage/work",
      invisible: !isWorker,
    }
  ];

  return (
    <PageSelector
      pages={pages.filter(page => !page.invisible)}
    />
  );
}
