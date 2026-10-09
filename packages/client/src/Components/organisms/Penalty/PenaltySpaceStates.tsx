"use client";

import { Card, Grid, Text } from "@chakra-ui/react";
import { IPenaltySpaceState } from "@scspace-depot/types/penalty";
import { PENALTY_SPACE_TYPE_LABEL } from "@scspace-depot/consts/penalty.const";
import { PenaltyStageEnum } from "@scspace-depot/enums/penalty.enum";
import { dateUtils } from "@scspace-client/Hooks/utils";

export default function PenaltySpaceStates({ spaces }: { spaces: IPenaltySpaceState[] }) {
    const { getDateString } = dateUtils();

    return (
        <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }} gap={2}>
            {spaces.map((s) => (
                <Card.Root key={s.spaceType} variant="outline">
                    <Card.Body gap={1}>
                        <Text fontWeight="bold">
                            {PENALTY_SPACE_TYPE_LABEL[s.spaceType].kr}
                        </Text>
                        <Text fontSize="sm">
                            {`주의 ${s.notice} · 경고 ${s.warning}`}
                        </Text>
                        {s.restrictionStage !== PenaltyStageEnum.NONE && s.restrictionEnd > 0 && (
                            <Text fontSize="sm" color="red.500">
                                {`~${getDateString(s.restrictionEnd)} 23:59 제한`}
                            </Text>
                        )}
                    </Card.Body>
                </Card.Root>
            ))}
        </Grid>
    );
}
