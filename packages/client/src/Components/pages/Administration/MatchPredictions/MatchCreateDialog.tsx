"use client";

import { Button, Dialog, Field, Input, Portal, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useCreateMatchInfo } from "@scspace-client/Hooks/match";
import { toaster } from "@scspace-client/Components/atoms/Toaster";

const emptyDraft = { matchName: "", teamA: "", teamB: "" };
const fields = [["matchName", "경기명", 255], ["teamA", "팀 A", 100], ["teamB", "팀 B", 100]] as const;

export default function MatchCreateDialog() {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(emptyDraft);
    const mutation = useCreateMatchInfo();
    const valid = Object.values(draft).every((value) => value.trim().length > 0);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!valid || mutation.isPending) return;
        mutation.mutate({ matchName: draft.matchName.trim(), teamA: draft.teamA.trim(), teamB: draft.teamB.trim() }, {
            onSuccess: ({ id }) => {
                setOpen(false);
                toaster.success({ title: `경기 #${id}가 추가되었습니다.` });
            },
        });
    }

    return (
        <Dialog.Root open={open} onOpenChange={({ open }) => { if (!mutation.isPending) setOpen(open); }}>
            <Button size="sm" colorPalette="cyan" onClick={() => { setDraft(emptyDraft); mutation.reset(); setOpen(true); }}>경기 추가</Button>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>경기 추가</Dialog.Title></Dialog.Header>
                        <form onSubmit={submit}>
                            <Dialog.Body>
                                <Stack gap={4}>
                                    <Text fontSize="sm" color="fg.muted">접수 OFF, 실제 점수 미입력 상태로 생성됩니다.</Text>
                                    {fields.map(([name, label, maxLength]) => (
                                        <Field.Root key={name} required>
                                            <Field.Label>{label}</Field.Label>
                                            <Input required maxLength={maxLength} value={draft[name]} disabled={mutation.isPending}
                                                onChange={(event) => setDraft({ ...draft, [name]: event.target.value })} />
                                        </Field.Root>
                                    ))}
                                    {mutation.isError && <Text role="alert" color="red.600">{mutation.error.message}</Text>}
                                </Stack>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>취소</Button>
                                <Button type="submit" colorPalette="cyan" disabled={!valid || mutation.isPending} loading={mutation.isPending}>추가</Button>
                            </Dialog.Footer>
                        </form>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
