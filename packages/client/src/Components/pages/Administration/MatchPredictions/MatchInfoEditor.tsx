"use client";

import { Button, Dialog, Field, Flex, Grid, Input, Portal, Stack, Text } from "@chakra-ui/react";
import MatchStartTime from "./MatchStartTime";
import { getMatchNow } from "@scspace-client/Components/pages/match-predict/match-time";
import { useState } from "react";
import type { FormEvent } from "react";
import type { IMatchInfo } from "@scspace-depot/types/match";
import { useUpdateMatchInfo } from "@scspace-client/Hooks/match";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import { buildMatchInfoUpdate, createMatchInfoDraft, MatchInfoDraft, scoreFields } from "./match-info-form";

function MatchInfoForm({ match, mutation, onClose }: {
    match: IMatchInfo;
    mutation: ReturnType<typeof useUpdateMatchInfo>;
    onClose: () => void;
}) {
    const [initial, setInitial] = useState(() => createMatchInfoDraft(match));
    const [draft, setDraft] = useState(initial);
    const [error, setError] = useState("");
    const submissionOpen = match.allowSubmission && match.startTime != null && getMatchNow() < match.startTime;
    const dirty = (Object.keys(initial) as (keyof MatchInfoDraft)[]).some((field) => initial[field] !== draft[field]);

    function submit(event: FormEvent) {
        event.preventDefault();
        if (mutation.isPending) return;
        setError("");
        try {
            const data = buildMatchInfoUpdate(initial, draft);
            if (!Object.keys(data).length) return;
            mutation.mutate({ matchId: match.id, data }, {
                onSuccess: () => {
                    toaster.success({ title: "경기 정보가 저장되었습니다." });
                    onClose();
                },
            });
        } catch (error) {
            setError(error instanceof Error ? error.message : "입력값을 확인해주세요.");
        }
    }

    function resetResults() {
        if (mutation.isPending || submissionOpen) return;
        setError("");
        mutation.mutate({ matchId: match.id, data: {
            firstScoreA: null, firstScoreB: null, secondScoreA: null, secondScoreB: null,
        } }, {
            onSuccess: () => {
                const cleared = { firstScoreA: "", firstScoreB: "", secondScoreA: "", secondScoreB: "" };
                setInitial((previous) => ({ ...previous, ...cleared }));
                setDraft((previous) => ({ ...previous, ...cleared }));
                toaster.success({ title: "실제 점수와 채점 결과가 초기화되었습니다." });
            },
        });
    }

    const textFields = [
        { name: "matchName", label: "경기명", maxLength: 255 },
        { name: "teamA", label: "팀 A", maxLength: 100 },
        { name: "teamB", label: "팀 B", maxLength: 100 },
    ] as const;
    const scoreRows = [
        { label: "전반 실제 점수", a: "firstScoreA", b: "firstScoreB", aLabel: "A1", bLabel: "B1" },
        { label: "최종 실제 점수 (누적)", a: "secondScoreA", b: "secondScoreB", aLabel: "A2", bLabel: "B2" },
    ] as const;
    const hasResults = scoreFields.some((field) => initial[field] !== "" || draft[field] !== "");

    return (
        <form onSubmit={submit}>
            <Dialog.Body>
                <Stack gap={4}>
                    <Text fontSize="sm" color="fg.muted">접수 종료 후 실제 점수를 저장하고 ‘채점 적용’을 누르세요. 점수를 수정하면 이전 채점값은 초기화됩니다. 최종 점수는 누적 점수이며, 빈 항목은 채점에서 제외합니다.</Text>
                    <MatchStartTime value={draft.startTime} disabled={mutation.isPending} onChange={(startTime) => setDraft({ ...draft, startTime })} />
                    <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4}>
                        {textFields.map(({ name, label, maxLength }) => (
                            <Field.Root key={name} required gridColumn={name === "matchName" ? "1 / -1" : undefined}>
                                <Field.Label>{label}</Field.Label>
                                <Input value={draft[name]} maxLength={maxLength} required disabled={mutation.isPending}
                                    onChange={(event) => { setDraft({ ...draft, [name]: event.target.value }); setError(""); }} />
                            </Field.Root>
                        ))}
                    </Grid>
                    <Stack gap={4} borderWidth="1px" rounded="md" p={3}>
                        {scoreRows.map((row) => (
                            <Stack key={row.a} gap={2}>
                                <Text fontWeight="semibold">{row.label}</Text>
                                <Grid templateColumns="minmax(0, 1fr) auto minmax(0, 1fr)" gap={3} alignItems="end">
                                    <Field.Root>
                                        <Field.Label>{row.aLabel} · {draft.teamA || "팀 A"}</Field.Label>
                                        <Input type="number" min={0} max={99} step={1} placeholder="미입력" textAlign="center"
                                            aria-label={`${row.label} 팀 A`} value={draft[row.a]}
                                            disabled={mutation.isPending || submissionOpen}
                                            onChange={(event) => { setDraft({ ...draft, [row.a]: event.target.value }); setError(""); }} />
                                    </Field.Root>
                                    <Text pb={2} aria-hidden="true">−</Text>
                                    <Field.Root>
                                        <Field.Label>{row.bLabel} · {draft.teamB || "팀 B"}</Field.Label>
                                        <Input type="number" min={0} max={99} step={1} placeholder="미입력" textAlign="center"
                                            aria-label={`${row.label} 팀 B`} value={draft[row.b]}
                                            disabled={mutation.isPending || submissionOpen}
                                            onChange={(event) => { setDraft({ ...draft, [row.b]: event.target.value }); setError(""); }} />
                                    </Field.Root>
                                </Grid>
                            </Stack>
                        ))}
                        <Flex direction="column" align="start" gap={1}>
                            <Button type="button" size="sm" variant="outline" colorPalette="red" onClick={resetResults}
                                disabled={!hasResults || mutation.isPending || submissionOpen}>결과 초기화</Button>
                            <Text fontSize="xs" color="fg.muted">전반·최종 점수와 채점값을 즉시 초기화합니다. 경기명·팀 이름의 편집 내용은 저장 버튼으로 반영하세요.</Text>
                        </Flex>
                    </Stack>
                    {(error || mutation.isError) && <Text role="alert" color="red.600">{error || mutation.error?.message}</Text>}
                </Stack>
            </Dialog.Body>
            <Dialog.Footer>
                <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>취소</Button>
                <Button type="submit" colorPalette="cyan" loading={mutation.isPending} disabled={!dirty}>저장</Button>
            </Dialog.Footer>
        </form>
    );
}

export default function MatchInfoEditor({ match, disabled }: { match: IMatchInfo; disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const mutation = useUpdateMatchInfo();
    return (
        <Dialog.Root open={open} onOpenChange={({ open }) => { if (!mutation.isPending) setOpen(open); }} size="lg" scrollBehavior="inside">
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => { mutation.reset(); setOpen(true); }} aria-label={`경기 #${match.id} 정보 수정`}>
                경기 정보 수정
            </Button>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>경기 정보 수정 · #{match.id}</Dialog.Title></Dialog.Header>
                        {open && <MatchInfoForm match={match} mutation={mutation} onClose={() => setOpen(false)} />}
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
