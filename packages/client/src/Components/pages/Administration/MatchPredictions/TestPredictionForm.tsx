"use client";

import { Button, Field, Grid, Input, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useCreateTestPrediction } from "@scspace-client/Hooks/match";

const initial = { userId: "", matchId: "", firstScoreA: "0", firstScoreB: "0", secondScoreA: "0", secondScoreB: "0" };
const fields = [
    ["userId", "사용자 ID"], ["matchId", "경기 ID"],
    ["firstScoreA", "전반 예측 · A"], ["firstScoreB", "전반 예측 · B"],
    ["secondScoreA", "최종 예측 · A"], ["secondScoreB", "최종 예측 · B"],
] as const;

export default function TestPredictionForm() {
    const [draft, setDraft] = useState(initial);
    const mutation = useCreateTestPrediction();

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (mutation.isPending) return;
        mutation.mutate({
            userId: Number(draft.userId), matchId: Number(draft.matchId),
            firstScoreA: Number(draft.firstScoreA), firstScoreB: Number(draft.firstScoreB),
            secondScoreA: Number(draft.secondScoreA), secondScoreB: Number(draft.secondScoreB),
        });
    }

    return (
        <form onSubmit={submit}>
            <Stack borderWidth="1px" rounded="sm" p={3} gap={3}>
                <Text fontWeight="semibold">테스트 예측 제출</Text>
                <Text fontSize="sm" color="fg.muted">실제 제출 목록에 저장됩니다. 기존 사용자·접수 중인 경기 ID를 입력하세요. 전화번호는 TEST로 저장됩니다.</Text>
                <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(6, 1fr)" }} gap={3}>
                    {fields.map(([name, label]) => {
                        const isId = name === "userId" || name === "matchId";
                        return (
                            <Field.Root key={name} required>
                                <Field.Label>{label}</Field.Label>
                                <Input size="sm" type="number" required min={isId ? 1 : 0} max={isId ? 2147483647 : 99} step={1}
                                    value={draft[name]} disabled={mutation.isPending}
                                    onChange={(event) => { setDraft({ ...draft, [name]: event.target.value }); mutation.reset(); }} />
                            </Field.Root>
                        );
                    })}
                </Grid>
                <Button type="submit" size="sm" alignSelf="start" loading={mutation.isPending}>테스트 제출</Button>
                {mutation.isError && <Text role="alert" color="red.600">{mutation.error.message}</Text>}
                {mutation.isSuccess && <Text role="status" color="green.600">저장되었습니다. 현재 목록 필터에 따라 표시되지 않을 수 있습니다.</Text>}
            </Stack>
        </form>
    );
}
