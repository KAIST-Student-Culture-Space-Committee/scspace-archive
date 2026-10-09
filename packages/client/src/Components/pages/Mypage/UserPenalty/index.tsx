"use client";

import { Heading, Separator, Stack, Text } from "@chakra-ui/react";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import PenaltySpaceStates from "@scspace-client/Components/organisms/Penalty/PenaltySpaceStates";
import PenaltyHistoryTable from "@scspace-client/Components/organisms/Penalty/PenaltyHistoryTable";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useMyPenalty } from "@scspace-client/Hooks/penalty";

export default function UserPenalty() {
    const { needLogin } = useAuth();
    needLogin();

    const { data: my } = useMyPenalty(true);

    if (!my) {
        return (
            <Scroll>
                <LoadingComponent />
            </Scroll>
        );
    }

    return (
        <Scroll>
            <Stack gap={6}>
                <Text color="fg.subtle" fontSize="sm">
                    주의 2회는 경고 1회로 치환 · 경고 1회 30일, 2회 90일 해당 공간 예약 제한 · 매년 봄학기 개강일에 주의/경고 초기화
                </Text>
                <Stack gap={3}>
                    <Heading size="md">개인</Heading>
                    <PenaltySpaceStates spaces={my.user.spaces} />
                    <PenaltyHistoryTable history={my.user.history} showIssuer={false} />
                </Stack>
                {my.organizations.map(({ organization, detail }) => (
                    <Stack gap={3} key={organization.id}>
                        <Separator />
                        <Heading size="md">{organization.name}</Heading>
                        <PenaltySpaceStates spaces={detail.spaces} />
                        <PenaltyHistoryTable history={detail.history} showIssuer={false} />
                    </Stack>
                ))}
            </Stack>
        </Scroll>
    );
}
