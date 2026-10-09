"use client"

import {
    Flex,
    Grid,
    HStack,
    IconButton,
    Stack,
    Text,
    useBreakpointValue,
} from "@chakra-ui/react";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useState } from "react";
import { HiOutlineRefresh } from "react-icons/hi";
import { useAllUser } from "@scspace-client/Hooks/user";
import { IUser } from "@scspace-depot/types/user";
import UserDialog from "../../../organisms/User/UserDialog";
import TooltipComponent from "@scspace-client/Components/atoms/Tooptip";
import SimpleTable from "@scspace-client/Components/atoms/SimpleTable";
import UserBadges from "@scspace-client/Components/organisms/User/UserBadges";
import PenaltyBadges from "@scspace-client/Components/organisms/Penalty/PenaltyBadges";
import { usePenaltyTargets } from "@scspace-client/Hooks/penalty";
import { PenaltyTargetEnum } from "@scspace-depot/enums/penalty.enum";

export default function ManageUser() {
    const { needManager } = useAuth();
    needManager();

    const { users, refetch } = useAllUser();
    const { data: penaltyTargets } = usePenaltyTargets(PenaltyTargetEnum.USER);

    const [selectedId, setSelectedId] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);
    const isWide = useBreakpointValue({ base: false, md: true });

    return (
        <>
            <UserDialog
                open={open}
                setOpen={setOpen}
                user={users?.find((u) => u.id === selectedId) ?? null}
                refetchList={refetch}
            />
            <Scroll>
                {!users ? (
                    <LoadingComponent />
                ) : (
                    <Grid
                        height="100%"
                        templateRows="auto 1fr auto"
                        gap={2}
                    >
                        <Flex
                            width="100%"
                            justify={isWide ? "space-between" : "end"}
                            alignItems="end"
                        >
                            {isWide && (
                                <Text margin={0} color="gray.focusRing">
                                    Click each row to see detail of reservation
                                </Text>
                            )}
                            <HStack
                                gap={2}
                                width={isWide ? "fit-content" : "100%"}
                                justify="space-between"
                            >
                                <TooltipComponent content="Refresh">
                                    <IconButton
                                        rounded="sm"
                                        variant="ghost"
                                        onClick={() => refetch()}
                                    >
                                        <HiOutlineRefresh color="gray" />
                                    </IconButton>
                                </TooltipComponent>
                            </HStack>
                        </Flex>
                        <Scroll>
                            <SimpleTable
                                onIdChange={(id: number) => {
                                    const user = users.find((u) => u.id === id);
                                    if (user) {
                                        setSelectedId(user.id);
                                        setOpen(true);
                                    }
                                }}
                                header={["StudentNumber", "Name", "email", "Badges"]}
                                content={users.map((u: IUser) => ({
                                    id: u.id,
                                    row: [
                                        u.studentNumber,
                                        // (<UserName key={u.id} user={u} />),
                                        u.nameKr,
                                        u.email,
                                        <Stack key={u.id} gap={1}>
                                            <UserBadges type={u.type} />
                                            <PenaltyBadges
                                                spaces={penaltyTargets?.find((t) => t.target.targetId === u.id)?.spaces ?? []}
                                            />
                                        </Stack>,
                                    ],
                                }))}
                            />
                        </Scroll>
                    </Grid>
                )}
            </Scroll>
        </>
    );
};