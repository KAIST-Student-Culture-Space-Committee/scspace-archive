"use client";

import { Badge, Wrap } from "@chakra-ui/react";
import { IPenaltySpaceState } from "@scspace-depot/types/penalty";
import { PENALTY_SPACE_TYPE_LABEL } from "@scspace-depot/consts/penalty.const";
import { PenaltyStageEnum } from "@scspace-depot/enums/penalty.enum";
import { dateUtils } from "@scspace-client/Hooks/utils";

export default function PenaltyBadges({ spaces, variant = "all" }: {
    spaces: IPenaltySpaceState[];
    variant?: "all" | "count" | "restriction";
}) {
    const { getDateString } = dateUtils();

    const countBadges = spaces
        .filter((s) => s.notice > 0 || s.warning > 0)
        .map((s) => (
            <Badge key={`count-${s.spaceType}`} colorPalette={s.warning > 0 ? "orange" : "yellow"}>
                {`${PENALTY_SPACE_TYPE_LABEL[s.spaceType].kr} 주의 ${s.notice}·경고 ${s.warning}`}
            </Badge>
        ));

    const restrictionBadges = spaces
        .filter((s) => s.restrictionStage !== PenaltyStageEnum.NONE && s.restrictionEnd > 0)
        .map((s) => (
            <Badge key={`restriction-${s.spaceType}`} colorPalette="red">
                {`${PENALTY_SPACE_TYPE_LABEL[s.spaceType].kr} 제한 ~${getDateString(s.restrictionEnd)}`}
            </Badge>
        ));

    const badges =
        variant === "count" ? countBadges :
            variant === "restriction" ? restrictionBadges :
                [...countBadges, ...restrictionBadges];

    return (
        <Wrap>
            {badges.length > 0 ? badges : "-"}
        </Wrap>
    );
}
