"use client";

import { useState } from "react";
import { Button, Flex, RadioGroup, Stack, Text } from "@chakra-ui/react";
import FieldComponent from "@scspace-client/Components/atoms/Field";
import AlertBtn from "@scspace-client/Components/atoms/AlertBtn";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import SelectComponent, { ISelectOption } from "@scspace-client/Components/molecules/forms/Select";
import TextareaComponent from "@scspace-client/Components/molecules/forms/Textarea";
import { useAllSpace } from "@scspace-client/Hooks/space";
import { usePenaltyAPI } from "@scspace-client/Hooks/penalty";
import { dateUtils } from "@scspace-client/Hooks/utils";
import { IPenaltySpaceState, IPenaltyTarget } from "@scspace-depot/types/penalty";
import {
    PENALTY_KIND_LABEL,
    PENALTY_REASON_MAX_LENGTH,
    PENALTY_SPACE_TYPES,
    PENALTY_SPACE_TYPE_LABEL,
} from "@scspace-depot/consts/penalty.const";
import { PenaltyKindEnum, PenaltyStageEnum } from "@scspace-depot/enums/penalty.enum";
import { SpaceTypeEnum } from "@scspace-depot/enums/space.enum";
import { applyPenalty } from "@scspace-depot/utils/penalty.utils";

export default function PenaltyImposeForm({ target, spaces, onImposed }: {
    target: IPenaltyTarget;
    spaces: IPenaltySpaceState[];
    onImposed: () => void;
}) {
    const { spaces: allSpaces } = useAllSpace();
    const { createPenalty } = usePenaltyAPI();
    const { getNow, getDateString, addDays } = dateUtils();

    const [spaceType, setSpaceType] = useState<SpaceTypeEnum>(PENALTY_SPACE_TYPES[0]);
    const [kind, setKind] = useState<PenaltyKindEnum>(PenaltyKindEnum.NOTICE);
    const [reason, setReason] = useState<string>("");

    const spaceOptions: ISelectOption[] = PENALTY_SPACE_TYPES.map((type) => ({
        value: String(type),
        label: PENALTY_SPACE_TYPE_LABEL[type].kr,
        description: (allSpaces ?? [])
            .filter((s) => s.spaceType === type)
            .map((s) => s.nameKr)
            .join(", "),
    }));

    const current = spaces.find((s) => s.spaceType === spaceType) ?? {
        notice: 0,
        warning: 0,
    };
    const preview = applyPenalty({ notice: current.notice, warning: current.warning }, kind);

    const reasonTooLong = reason.length > PENALTY_REASON_MAX_LENGTH;
    const canSubmit = reason.trim().length > 0 && !reasonTooLong;

    function handleSubmit() {
        createPenalty({
            targetType: target.targetType,
            targetId: target.targetId,
            spaceType,
            kind,
            reason,
        }).then(() => {
            toaster.success({ title: "부과되었습니다." });
            setReason("");
            onImposed();
        }).catch((error) => {
            toaster.error({
                title: "부과 실패",
                description: error instanceof Error ? error.message : "다시 시도해주세요.",
            });
        });
    }

    return (
        <Stack gap={4}>
            <SelectComponent
                inDialog
                label="공간 종류"
                optionList={spaceOptions}
                defaultValue={String(spaceType)}
                onChange={(e) => setSpaceType(Number(e.value) as SpaceTypeEnum)}
            />
            <FieldComponent options={{ label: "종류", required: true }}>
                <RadioGroup.Root
                    value={String(kind)}
                    onValueChange={(e) => setKind(Number(e.value) as PenaltyKindEnum)}
                    colorPalette="orange"
                >
                    <Flex gap={4}>
                        <RadioGroup.Item value={String(PenaltyKindEnum.NOTICE)}>
                            <RadioGroup.ItemHiddenInput />
                            <RadioGroup.ItemIndicator />
                            <RadioGroup.Label>{PENALTY_KIND_LABEL.NOTICE.kr}</RadioGroup.Label>
                        </RadioGroup.Item>
                        <RadioGroup.Item value={String(PenaltyKindEnum.WARNING)}>
                            <RadioGroup.ItemHiddenInput />
                            <RadioGroup.ItemIndicator />
                            <RadioGroup.Label>{PENALTY_KIND_LABEL.WARNING.kr}</RadioGroup.Label>
                        </RadioGroup.Item>
                    </Flex>
                </RadioGroup.Root>
            </FieldComponent>
            <TextareaComponent
                label="사유"
                required
                value={reason}
                onChange={setReason}
                helpertext={`${reason.length}/${PENALTY_REASON_MAX_LENGTH}`}
                errortext={reasonTooLong ? "최대 1000자까지 입력 가능합니다." : undefined}
            />
            <Stack gap={1} bg="bg.muted" p={3} rounded="sm">
                <Text fontSize="sm">
                    {`부과 후 누적: 주의 ${preview.next.notice} / 경고 ${preview.next.warning}`}
                </Text>
                {preview.converted && (
                    <Text fontSize="sm" color="orange.600">
                        주의 2회 누적 → 경고 1회로 치환
                    </Text>
                )}
                {preview.stage !== PenaltyStageEnum.NONE && (
                    <Text fontSize="sm" color="red.600">
                        {`${PENALTY_SPACE_TYPE_LABEL[spaceType].kr} ${preview.restrictionDays}일 예약 제한 (${getDateString(addDays(getNow(), preview.restrictionDays))} 23:59까지)`}
                        {preview.stage === PenaltyStageEnum.SECOND && " · 이후 경고 초기화"}
                    </Text>
                )}
            </Stack>
            <AlertBtn
                onClick={handleSubmit}
                colorPalette="orange"
                buttonText="부과"
                dialogTitle="확인"
                dialogBody="메일이 발송됩니다. 부과할까요?"
            >
                <Button colorPalette="orange" rounded="sm" disabled={!canSubmit}>
                    부과
                </Button>
            </AlertBtn>
        </Stack>
    );
}
