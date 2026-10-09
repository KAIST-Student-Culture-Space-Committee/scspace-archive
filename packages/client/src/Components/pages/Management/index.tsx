"use client"

import React from "react";
import { useAuth } from "@scspace-client/Hooks/auth";
import PageSelector, { IPage } from "../../molecules/page/PageSelector";
import ManageOrganization from "./Organization";
import ManageReservation from "./Reservation";
import ManageRental from "./Rental";
import ManagePenalty from "./Penalty";

export default function Management() {
  const { needManager } = useAuth();
  needManager();

  const pages: IPage[] = [
    {
      href: "/manage/organization",
      kor: "조직",
      eng: "Organization",
      preview: (<ManageOrganization />)
    },
    {
      href: "/manage/reservation",
      kor: "예약",
      eng: "Reservation",
      preview: (<ManageReservation />)
    },
    {
      href: "/manage/rental",
      kor: "대여",
      eng: "Rental",
      preview: (<ManageRental />)
    },
    {
      href: "/manage/penalty",
      kor: "부과",
      eng: "Penalty",
      preview: (<ManagePenalty />)
    }
  ]

  return (
    <PageSelector
      pages={pages}
    />
  );
};