"use client";

import { useState } from "react";
import { Badge } from "@chakra-ui/react";
import { useQueryApi } from "@scspace-client/Hooks/api";
import { dateUtils } from "@scspace-client/Hooks/utils";
import { IReservationAll } from "@scspace-depot/types/reservation";
import { ReservationStateEnum } from "@scspace-depot/enums/reservation.enum";
import { OfficeHoursUtils } from "@scspace-depot/utils/office-hours.utils";

// 미래홀, 조수미홀의 현재 상태 (공연 중 / 사용 중 / 비어있음), 상근 시간에만 표시
export default function HallNowStatus({ spaceId }: { spaceId: number }) {
  const { getTime } = dateUtils();
  const [now] = useState(() => new Date());
  const t = getTime(now);
  const officeHour = OfficeHoursUtils.overlapsOfficeHours(t, t + 1);
  const today = getTime(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  const { data } = useQueryApi<IReservationAll[]>(
    `/reservation/space?spaceId=${spaceId}&timeFrom=${today}&timeTo=${today}`,
    undefined,
    { enabled: officeHour }
  );
  if (!officeHour || !data) return null;

  const current = data.filter(r => r.state === ReservationStateEnum.GRANT && r.timeFrom <= t && t < r.timeTo);
  const [label, color] = current.some(r => r.content?.performance) ? ["공연 중", "red"]
    : current.length > 0 ? ["사용 중", "orange"]
    : ["비어있음", "green"];

  return <Badge colorPalette={color} ml={2} verticalAlign="middle">{label}</Badge>;
}
