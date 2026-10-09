"use client";

import React, { useEffect, useState } from "react";
import { Stack, Tabs } from "@chakra-ui/react";
import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import SimpleTable from "@scspace-client/Components/atoms/SimpleTable";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import StudentSearch from "@scspace-client/Components/organisms/Rental/AdminTools/StudentSearch";
import { AllOrganizationForm } from "@scspace-client/Components/organisms/Reservation/Forms/OrganizationAll";
import PenaltyBadges from "@scspace-client/Components/organisms/Penalty/PenaltyBadges";
import PenaltyDialog from "@scspace-client/Components/organisms/Penalty/PenaltyDialog";
import { useAuth } from "@scspace-client/Hooks/auth";
import { usePenaltyTargets } from "@scspace-client/Hooks/penalty";
import { useOrganizationAPI } from "@scspace-client/Hooks/organization";
import { dateUtils } from "@scspace-client/Hooks/utils";
import { IUser } from "@scspace-depot/types/user";
import { IOrganizationDelegator } from "@scspace-depot/types/organization";
import { OrganizationStatusEnum } from "@scspace-depot/enums/organization.enum";
import { IndividualOrganizationId } from "@scspace-depot/consts/organization.const";
import { PenaltyStageEnum, PenaltyTargetEnum } from "@scspace-depot/enums/penalty.enum";
import { IPenaltyTarget, IPenaltyTargetSummary } from "@scspace-depot/types/penalty";
import { PENALTY_RESTRICTION_DAYS, PENALTY_SPACE_TYPE_LABEL } from "@scspace-depot/consts/penalty.const";

const RESTRICTED_ORG_STATUSES = [
    OrganizationStatusEnum.REGISTERED,
    OrganizationStatusEnum.VERIFY_REQUEST,
    OrganizationStatusEnum.VERIFIED,
];

// Valid penalty target: not the individual pseudo-organization, and an active-ish status.
const isValidOrgTarget = (org: IOrganizationDelegator): boolean =>
    org.id !== IndividualOrganizationId && RESTRICTED_ORG_STATUSES.includes(org.status);

type OnSelectTarget = (target: IPenaltyTarget, title: string) => void;

function UsersTab({ targets, onSelect }: {
    targets: IPenaltyTargetSummary[] | null | undefined;
    onSelect: OnSelectTarget;
}) {
    return (
        <Stack gap={4}>
            <StudentSearch
                onSelect={(user: IUser) =>
                    onSelect({ targetType: PenaltyTargetEnum.USER, targetId: user.id }, user.nameKr)
                }
            />
            {!targets ? (
                <LoadingComponent />
            ) : (
                <SimpleTable
                    onIdChange={(id) => {
                        const t = targets.find((t) => t.target.targetId === id);
                        if (t) onSelect(t.target, t.name);
                    }}
                    header={["Name", "Student Number", "Notice / Warning", "Restriction"]}
                    content={targets.map((t) => ({
                        id: t.target.targetId,
                        row: [
                            t.name,
                            t.studentNumber ?? "-",
                            <PenaltyBadges key={`c-${t.target.targetId}`} spaces={t.spaces} variant="count" />,
                            <PenaltyBadges key={`r-${t.target.targetId}`} spaces={t.spaces} variant="restriction" />,
                        ],
                    }))}
                />
            )}
        </Stack>
    );
}

function OrganizationsTab({ organizations, targets, onSelect }: {
    organizations: IOrganizationDelegator[] | null | undefined;
    targets: IPenaltyTargetSummary[] | null | undefined;
    onSelect: OnSelectTarget;
}) {
    // setOrgId from AllOrganizationForm; resolved and consumed by the effect below
    // (kept separate from the Combobox's own onChange so opening the dialog never
    // runs synchronously inside the search component's internal selection handling).
    const [searchedOrgId, setSearchedOrgId] = useState<number>(0);

    useEffect(() => {
        if (!searchedOrgId || !organizations) return;
        const org = organizations.find((o) => o.id === searchedOrgId);
        if (org && isValidOrgTarget(org)) {
            onSelect({ targetType: PenaltyTargetEnum.ORGANIZATION, targetId: org.id }, org.name);
        }
        setSearchedOrgId(0);
    }, [searchedOrgId, organizations, onSelect]);

    if (!organizations || !targets) return <LoadingComponent />;

    const rows = organizations.filter(isValidOrgTarget);

    return (
        <Stack gap={4}>
            <AllOrganizationForm setOrgId={setSearchedOrgId} />
            <SimpleTable
                onIdChange={(id) => {
                    const org = rows.find((o) => o.id === id);
                    if (org) onSelect({ targetType: PenaltyTargetEnum.ORGANIZATION, targetId: org.id }, org.name);
                }}
                header={["Name", "Delegator", "Notice / Warning", "Restriction"]}
                content={rows.map((org) => {
                    const t = targets.find((t) => t.target.targetId === org.id);
                    return {
                        id: org.id,
                        row: [
                            org.name,
                            org.delegator.nameKr,
                            <PenaltyBadges key={`c-${org.id}`} spaces={t?.spaces ?? []} variant="count" />,
                            <PenaltyBadges key={`r-${org.id}`} spaces={t?.spaces ?? []} variant="restriction" />,
                        ],
                    };
                })}
            />
        </Stack>
    );
}

function RestrictedTab({ userTargets, orgTargets, onSelect }: {
    userTargets: IPenaltyTargetSummary[] | null | undefined;
    orgTargets: IPenaltyTargetSummary[] | null | undefined;
    onSelect: OnSelectTarget;
}) {
    const { getString } = dateUtils();

    if (!userTargets || !orgTargets) return <LoadingComponent />;

    const rows: { target: IPenaltyTarget; name: string; space: string; stage: string; until: string }[] = [];

    function collect(targets: IPenaltyTargetSummary[], label: (t: IPenaltyTargetSummary) => string) {
        targets.forEach((t) => {
            t.spaces
                .filter((s) => s.restrictionStage !== PenaltyStageEnum.NONE && s.restrictionEnd > 0)
                .forEach((s) => {
                    const stage = s.restrictionStage as PenaltyStageEnum.FIRST | PenaltyStageEnum.SECOND;
                    rows.push({
                        target: t.target,
                        name: label(t),
                        space: PENALTY_SPACE_TYPE_LABEL[s.spaceType].kr,
                        stage: `${PENALTY_RESTRICTION_DAYS[stage]}일`,
                        until: getString(s.restrictionEnd),
                    });
                });
        });
    }

    collect(userTargets, (t) => `[개인] ${t.name} (${t.studentNumber ?? "-"})`);
    collect(orgTargets, (t) => `[조직] ${t.name}`);

    return (
        <SimpleTable
            onIdChange={(id) => {
                const row = rows[id];
                if (row) onSelect(row.target, row.name);
            }}
            header={["Name", "Space", "Stage", "Until"]}
            content={rows.map((row, index) => ({
                id: index,
                row: [row.name, row.space, row.stage, row.until],
            }))}
        />
    );
}

export default function ManagePenalty() {
    const { needManager } = useAuth();
    needManager();

    const { data: userTargets, refetch: refetchUsers } = usePenaltyTargets(PenaltyTargetEnum.USER);
    const { data: orgTargets, refetch: refetchOrgs } = usePenaltyTargets(PenaltyTargetEnum.ORGANIZATION);
    const { data: organizations } = useOrganizationAPI().allOrganizations;

    const [open, setOpen] = useState<boolean>(false);
    const [target, setTarget] = useState<IPenaltyTarget | null>(null);
    const [title, setTitle] = useState<string>("");

    function openTarget(t: IPenaltyTarget, name: string) {
        setTarget(t);
        setTitle(name);
        setOpen(true);
    }

    function refetchAll() {
        refetchUsers();
        refetchOrgs();
    }

    const tabList: { [key: string]: React.ReactNode } = {
        Users: <UsersTab targets={userTargets} onSelect={openTarget} />,
        Organizations: (
            <OrganizationsTab organizations={organizations} targets={orgTargets} onSelect={openTarget} />
        ),
        Restricted: (
            <RestrictedTab userTargets={userTargets} orgTargets={orgTargets} onSelect={openTarget} />
        ),
    };

    return (
        <Scroll>
            <PenaltyDialog
                open={open}
                setOpen={setOpen}
                target={target}
                title={title}
                onChanged={refetchAll}
            />
            <Tabs.Root defaultValue={Object.keys(tabList)[0]} fitted minHeight="full">
                <Tabs.List>
                    {Object.keys(tabList).map((key) => (
                        <Tabs.Trigger key={key} value={key}>{key}</Tabs.Trigger>
                    ))}
                </Tabs.List>
                {Object.entries(tabList).map(([key, content]) => (
                    <Tabs.Content key={key} value={key} minHeight="full">
                        {content}
                    </Tabs.Content>
                ))}
            </Tabs.Root>
        </Scroll>
    );
}
