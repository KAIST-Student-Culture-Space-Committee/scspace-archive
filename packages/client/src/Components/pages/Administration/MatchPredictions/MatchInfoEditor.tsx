"use client";

import { Button, Dialog, Field, Grid, Input, Portal, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { FormEvent } from "react";
import type { IMatchInfo } from "@scspace-depot/types/match";
import { useUpdateMatchInfo } from "@scspace-client/Hooks/match";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import { buildMatchInfoUpdate, createMatchInfoDraft, MatchInfoDraft } from "./match-info-form";

function MatchInfoForm({ match, mutation, onClose }: {
    match: IMatchInfo;
    mutation: ReturnType<typeof useUpdateMatchInfo>;
    onClose: () => void;
}) {
    const [initial] = useState(() => createMatchInfoDraft(match));
    const [draft, setDraft] = useState(initial);
    const [error, setError] = useState("");
    const dirty = (Object.keys(initial) as (keyof MatchInfoDraft)[]).some((field) => initial[field] !== draft[field]);

    function submit(event: FormEvent) {
        event.preventDefault();
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

    const fields: { name: keyof MatchInfoDraft; label: string; type?: string; maxLength?: number }[] = [
        { name: "matchName", label: "경기명", maxLength: 255 },
        { name: "teamA", label: "팀 A", maxLength: 100 },
        { name: "teamB", label: "팀 B", maxLength: 100 },
        { name: "firstScoreA", label: "전반 실제 점수 · 팀 A", type: "number" },
        { name: "firstScoreB", label: "전반 실제 점수 · 팀 B", type: "number" },
        { name: "secondScoreA", label: "최종 실제 점수 · 팀 A", type: "number" },
        { name: "secondScoreB", label: "최종 실제 점수 · 팀 B", type: "number" },
    ];

    return (
        <form onSubmit={submit}>
            <Dialog.Body>
                <Stack gap={4}>
                    <Text fontSize="sm" color="fg.muted">점수를 비워두면 미입력으로 저장합니다. 실제 점수 저장 시 예측 결과가 자동 채점되지는 않습니다.</Text>
                    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                        {fields.map(({ name, label, type = "text", maxLength }) => (
                            <Field.Root key={name} required={type !== "number"}>
                                <Field.Label>{label}</Field.Label>
                                <Input
                                    type={type}
                                    value={draft[name]}
                                    maxLength={maxLength}
                                    required={type !== "number"}
                                    min={type === "number" ? 0 : undefined}
                                    max={type === "number" ? 99 : undefined}
                                    step={type === "number" ? 1 : undefined}
                                    placeholder={type === "number" ? "미입력" : undefined}
                                    disabled={mutation.isPending}
                                    onChange={(event) => { setDraft({ ...draft, [name]: event.target.value }); setError(""); }}
                                />
                            </Field.Root>
                        ))}
                    </Grid>
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
