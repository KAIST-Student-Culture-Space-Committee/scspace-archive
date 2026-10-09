"use client"

import {
    Flex,
    Text,
    Grid,
    IconButton,
    HStack,
    useBreakpointValue,
    Tabs
} from "@chakra-ui/react";
import { useState, } from "react";
import { IOrganizationDelegator, } from "@scspace-depot/types/organization";
import { HiOutlineRefresh } from "react-icons/hi";

import { dateUtils } from "@scspace-client/Hooks/utils";
import SimpleTable from "@scspace-client/Components/atoms/SimpleTable";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import TooltipComponent from "@scspace-client/Components/atoms/Tooptip";
import OrganizationDialog from "@scspace-client/Components/organisms/Organization/OrganizationDetail";
import OrganizationName from "./OrganizationName";
import NewOrganizationBtn from "./NewOrganizationBtn";
import { OrganizationStatusEnum } from "@scspace-depot/enums/organization.enum";
import RefetchBtn from "@scspace-client/Components/molecules/buttons/RefetchBtn";
import PenaltyBadges from "@scspace-client/Components/organisms/Penalty/PenaltyBadges";
import { IPenaltyTargetSummary } from "@scspace-depot/types/penalty";

export default function OrganizationTable({ uid, disabled, organization, refetch, helperText, showTabs, penaltyTargets }: {
    helperText?: string;
    disabled?: boolean;
    uid?: number;
    organization: IOrganizationDelegator[];
    refetch: () => void;
    showTabs?: boolean;
    penaltyTargets?: IPenaltyTargetSummary[];
}) {
    const [selected, setSelected] = useState<number>(-1);

    const [open, setOpen] = useState<boolean>(false);

    const { getString } = dateUtils();

    const isWide = useBreakpointValue({ base: false, md: true });

    const [tab, setTab] = useState<string>("all");

    return (
        <>
            <Grid
                height="100%"
                templateRows="auto 1fr"
                gap={2}
            >
                <Flex
                    width="100%"
                    justify={isWide ? "space-between" : "end"}
                    alignItems="end"
                >
                    {isWide && (showTabs ? (
                        <Tabs.Root
                            value={tab}
                            onValueChange={(e) => setTab(e.value)}
                        >
                            <Tabs.List>
                                <Tabs.Trigger value="all">
                                    All
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value={OrganizationStatusEnum.VERIFIED.toString()}
                                >
                                    Verified
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value={OrganizationStatusEnum.VERIFY_REQUEST.toString()}
                                >
                                    Verification Pending
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value={OrganizationStatusEnum.REGISTERED.toString()}
                                >
                                    Registered
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value={OrganizationStatusEnum.REGISTER_REQUEST.toString()}
                                >
                                    Registration Pending
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value={OrganizationStatusEnum.REJECTED.toString()}
                                >
                                    Rejected
                                </Tabs.Trigger>
                            </Tabs.List>
                        </Tabs.Root>
                    ) : (
                        <Text margin={0} color="gray.focusRing">
                            {helperText ? (
                                helperText
                            ) : (
                                "Click each row to see detail of organization"
                            )}
                        </Text>
                    ))}
                    <HStack>
                        <RefetchBtn refetch={refetch} />
                        {uid && (
                            <NewOrganizationBtn
                                uid={uid}
                                onSuccess={() => refetch()}
                            />
                        )}
                    </HStack>
                </Flex>
                <Scroll>
                    <SimpleTable
                        onIdChange={!disabled ? (
                            (id: number) => {
                                setSelected(id);
                                setOpen(true);
                            }
                        ) : (undefined)}
                        header={[
                            "Name",
                            "Delegator",
                            "Contact",
                            "Update Time"
                        ]}
                        content={organization
                            .filter(org => tab === "all" || org.status.toString() === tab)
                            .map((org: IOrganizationDelegator) => ({
                                id: org.id,
                                row: [
                                    (
                                        <HStack key={org.id}>
                                            <OrganizationName status={org.status}>
                                                {org.name}
                                            </OrganizationName>
                                            {penaltyTargets && (
                                                <PenaltyBadges
                                                    spaces={
                                                        penaltyTargets.find((t) => t.target.targetId === org.id)?.spaces ?? []
                                                    }
                                                />
                                            )}
                                        </HStack>
                                    ),
                                    org.delegator.nameKr,
                                    org.delegator.email,
                                    getString(org.timeUpdate)
                                ]
                            }))
                        }
                    />
                </Scroll>
            </Grid>
            <OrganizationDialog
                open={open}
                setOpen={setOpen}
                id={selected}
                refetchList={() => refetch()}
            />
        </>
    );
}