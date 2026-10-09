"use client"

import { useAuth } from "@scspace-client/Hooks/auth";
import { useOrganizationAPI, } from "@scspace-client/Hooks/organization";
import { usePenaltyTargets } from "@scspace-client/Hooks/penalty";
import { PenaltyTargetEnum } from "@scspace-depot/enums/penalty.enum";

import Scroll from "@scspace-client/Components/molecules/page/Scroll";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import OrganizationTable from "@scspace-client/Components/organisms/Organization/OrganizationTable";

export default function ManageOrganization() {
    const { needManager } = useAuth();
    needManager();

    const { data: organization, refetch } = useOrganizationAPI().allOrganizations;
    const { data: penaltyTargets } = usePenaltyTargets(PenaltyTargetEnum.ORGANIZATION);

    return (
        <Scroll>
            {organization ? (
                <OrganizationTable
                    organization={organization}
                    refetch={refetch}
                    showTabs
                    penaltyTargets={penaltyTargets}
                />
            ) : (
                <LoadingComponent />
            )}
        </Scroll >
    );
}