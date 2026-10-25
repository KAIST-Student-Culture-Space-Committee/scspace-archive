"use client";

import { Box, Button, Dialog, Field, Flex, Grid, Image, Input, Portal, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { MATCH_AD_MAX, MATCH_PRIZE_PLACES } from "@scspace-depot/types/match";
import type { IMatchPrize } from "@scspace-depot/types/match";
import { matchImageUrl } from "@scspace-client/Hooks/match";
import { useCreateMatchAd, useDeleteMatchAd, useMatchAds, useMatchPrizes, useUpdateMatchPrize } from "@scspace-client/Hooks/match-event";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import MatchLogoField from "./MatchLogoField";

const placeLabel = ["", "1등", "2등", "3등"];

export function MatchAdDialog() {
    const [open, setOpen] = useState(false);
    const ads = useMatchAds();
    const create = useCreateMatchAd();
    const remove = useDeleteMatchAd();
    const [file, setFile] = useState<File | null>(null);
    const [fieldKey, setFieldKey] = useState(0); // remounts the file input so its selection is cleared
    const list = ads.data?.data ?? [];
    const full = list.length >= MATCH_AD_MAX;
    const busy = create.isPending || remove.isPending;

    function add() {
        if (!file || busy) return;
        create.mutate(file, {
            onSuccess: () => {
                setFile(null);
                setFieldKey((key) => key + 1);
                toaster.success({ title: "배너가 추가되었습니다." });
            },
        });
    }

    function removeAd(id: number) {
        if (busy || !window.confirm("이 배너를 삭제할까요? 업로드된 이미지도 함께 삭제됩니다.")) return;
        remove.mutate(id, { onSuccess: () => toaster.success({ title: "배너가 삭제되었습니다." }) });
    }

    return (
        <Dialog.Root open={open} onOpenChange={({ open }) => { if (!busy) setOpen(open); }} size="lg" scrollBehavior="inside">
            <Button size="sm" variant="outline" onClick={() => { create.reset(); remove.reset(); setFile(null); setOpen(true); }}>배너 관리</Button>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>AD ZONE 배너 관리</Dialog.Title></Dialog.Header>
                        <Dialog.Body>
                            <Stack gap={4}>
                                <Text fontSize="sm" color="fg.muted">모든 경기 페이지 하단 AD ZONE에 등록 순서대로 표시됩니다. 최대 {MATCH_AD_MAX}개, GIF 가능(10MB 이하). 클릭 시 이동은 지원하지 않습니다.</Text>
                                {ads.isPending ? <Text color="fg.muted">loading banners...</Text>
                                    : ads.isError ? <Text role="alert" color="red.600">배너 목록을 불러오지 못했습니다.</Text>
                                        : list.length === 0 ? <Text color="fg.muted">등록된 배너가 없습니다. 배너가 없으면 AD ZONE이 표시되지 않습니다.</Text>
                                            : <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3}>
                                                {list.map((ad, index) => (
                                                    <Stack key={ad.id} gap={1}>
                                                        <Box aspectRatio="324 / 72" borderWidth="1px" rounded="md" overflow="hidden" bg="bg.muted">
                                                            <Image src={matchImageUrl(ad.image)} alt={`배너 ${index + 1}`} w="full" h="full" objectFit="cover" />
                                                        </Box>
                                                        <Flex justify="space-between" align="center">
                                                            <Text fontSize="xs" color="fg.muted">#{index + 1}</Text>
                                                            <Button size="2xs" variant="outline" colorPalette="red" disabled={busy} onClick={() => removeAd(ad.id)}>삭제</Button>
                                                        </Flex>
                                                    </Stack>
                                                ))}
                                            </Grid>}
                                <Stack gap={2} borderWidth="1px" rounded="md" p={3}>
                                    <MatchLogoField key={fieldKey} label="새 배너 이미지" file={file} maxMB={10} disabled={busy || full}
                                        previewSize={{ w: "100%", h: "72px" }} onChange={setFile} />
                                    {full && <Text fontSize="sm" color="fg.muted">배너는 최대 {MATCH_AD_MAX}개입니다. 삭제 후 추가해주세요.</Text>}
                                    <Button alignSelf="start" size="sm" colorPalette="cyan" disabled={!file || full} loading={create.isPending} onClick={add}>배너 추가</Button>
                                </Stack>
                                {(create.isError || remove.isError) && <Text role="alert" color="red.600">{create.error?.message ?? remove.error?.message}</Text>}
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>닫기</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}

function PrizeRow({ place, prize }: { place: number; prize?: IMatchPrize }) {
    const update = useUpdateMatchPrize();
    const [name, setName] = useState(prize?.name ?? "");
    const [nameEn, setNameEn] = useState(prize?.nameEn ?? "");
    const [image, setImage] = useState<File | null>(null);
    const [fieldKey, setFieldKey] = useState(0);
    const dirty = name !== (prize?.name ?? "") || nameEn !== (prize?.nameEn ?? "") || !!image;
    const valid = name.trim().length > 0 && nameEn.trim().length > 0;

    function save() {
        if (!valid || update.isPending) return;
        update.mutate({ place, name: name.trim(), nameEn: nameEn.trim(), image }, {
            onSuccess: () => {
                setImage(null);
                setFieldKey((key) => key + 1);
                toaster.success({ title: `${placeLabel[place]} 상품이 저장되었습니다.` });
            },
        });
    }

    return (
        <Stack gap={3} borderWidth="1px" rounded="md" p={3}>
            <Text fontWeight="semibold">{placeLabel[place]}</Text>
            <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3}>
                <Field.Root required>
                    <Field.Label>상품명 (한국어)</Field.Label>
                    <Input value={name} maxLength={100} disabled={update.isPending} onChange={(event) => setName(event.target.value)} />
                </Field.Root>
                <Field.Root required>
                    <Field.Label>상품명 (영어)</Field.Label>
                    <Input value={nameEn} maxLength={100} disabled={update.isPending} onChange={(event) => setNameEn(event.target.value)} />
                </Field.Root>
            </Grid>
            <MatchLogoField key={fieldKey} label="상품 이미지" file={image} current={prize?.image} disabled={update.isPending}
                previewSize={{ w: "160px", h: "100px" }} onChange={setImage} />
            {update.isError && <Text role="alert" color="red.600">{update.error.message}</Text>}
            <Button alignSelf="start" size="sm" colorPalette="cyan" disabled={!dirty || !valid} loading={update.isPending} onClick={save}>저장</Button>
        </Stack>
    );
}

export function MatchPrizeDialog() {
    const [open, setOpen] = useState(false);
    const prizes = useMatchPrizes();
    const byPlace = new Map((prizes.data?.data ?? []).map((prize) => [prize.place, prize]));

    return (
        <Dialog.Root open={open} onOpenChange={({ open }) => setOpen(open)} size="lg" scrollBehavior="inside">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>상품 관리</Button>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>1~3등 상품 관리</Dialog.Title></Dialog.Header>
                        <Dialog.Body>
                            <Stack gap={4}>
                                <Text fontSize="sm" color="fg.muted">Prizes 페이지에 한국어 상품명이 크게, 영어 상품명이 그 아래 작게 표시됩니다. 등수별로 저장하세요.</Text>
                                {prizes.isPending ? <Text color="fg.muted">loading prizes...</Text>
                                    : prizes.isError ? <Text role="alert" color="red.600">상품 목록을 불러오지 못했습니다.</Text>
                                        : MATCH_PRIZE_PLACES.map((place) => <PrizeRow key={place} place={place} prize={byPlace.get(place)} />)}
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="outline" onClick={() => setOpen(false)}>닫기</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
