"use client"

import { Alert, Button, CloseButton, Dialog, Flex, Stack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useQueryApi } from "@scspace-client/Hooks/api";
import { useAllSpace } from "@scspace-client/Hooks/space";
import { getBusinessNow } from "@scspace-client/Hooks/utils";
import { DutyUtils } from "@scspace-depot/utils/duty.utils";
import { IReservationAll } from "@scspace-depot/types/reservation";

export default function DutyStatusHeader() {
    const { isManager } = useAuth();
    const { spaces } = useAllSpace();
    const [now, setNow] = useState<number>(getBusinessNow);

    useEffect(() => {
        const timer = setInterval(() => setNow(getBusinessNow()), 30 * 1000);
        return () => clearInterval(timer);
    }, []);

    const DUTY_MARGIN = 60;
    const dutyWindow = DutyUtils.getDutyWindows(now - DUTY_MARGIN, now + DUTY_MARGIN + 1)[0];

    const { data, refetch } = useQueryApi<IReservationAll[]>(
        isManager && dutyWindow ? "/reservation/duty" : "",
        dutyWindow ? { timeFrom: dutyWindow.timeFrom - DUTY_MARGIN, timeTo: dutyWindow.timeTo + DUTY_MARGIN } : undefined,
    );

    if (!isManager || !dutyWindow || !spaces) return null;

    const getStatus = (spaceId: number) => {
        const current = (data ?? []).filter(
            (r) => r.spaceId === spaceId && r.timeFrom <= now && now < r.timeTo,
        );
        if (current.some((r) => r.content.performance)) return "공연 중";
        if (current.length > 0) return "사용 중";
        return "비어 있음";
    };

    return (
        <Dialog.Root scrollBehavior={"inside"}>
            <Dialog.Trigger asChild>
                <Button
                    size={"xs"}
                    colorPalette={"blue"}
                    onClick={() => refetch()}
                >
                    Reservation Status
                </Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content>
                    <Dialog.Header>
                        <Flex justify={"space-between"} w={"full"}>
                            <Dialog.Title>
                                Reservation Status
                            </Dialog.Title>
                            <Dialog.ActionTrigger asChild>
                                <CloseButton size={"xs"} variant={"outline"} />
                            </Dialog.ActionTrigger>
                        </Flex>
                    </Dialog.Header>
                    <Dialog.Body>
                        <Stack>
                            {spaces.map((space) => (
                                <Alert.Root key={space.id}>
                                    <Alert.Title>
                                        {getStatus(space.id)}
                                    </Alert.Title>
                                    <Alert.Description>
                                        {space.nameKr} ({space.nameEn})
                                    </Alert.Description>
                                </Alert.Root>
                            ))}
                        </Stack>
                    </Dialog.Body>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
}
