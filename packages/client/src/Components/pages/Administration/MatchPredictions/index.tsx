"use client";

import { Button, Field, Flex, Grid, Input, NativeSelect, Stack, Switch, Table, Text } from "@chakra-ui/react";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useAllMatchPredictions, useApplyMatchGrading, useMatchSubmissionAdmin } from "@scspace-client/Hooks/match";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineRefresh } from "react-icons/hi";
import { emptyPredictionFilters, filterPredictions, PredictionFilters } from "./filters";
import MatchInfoEditor from "./MatchInfoEditor";
import TestPredictionForm from "./TestPredictionForm";
import MatchCreateDialog from "./MatchCreateDialog";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

function formatSubmitTime(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export default function MatchPredictions() {
    const { isAdmin, isLogined, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const predictions = useAllMatchPredictions(!authLoading && isAdmin);
    const { matches, updateSubmission } = useMatchSubmissionAdmin(!authLoading && isAdmin);
    const applyGrading = useApplyMatchGrading();
    const [filters, setFilters] = useState<PredictionFilters>(emptyPredictionFilters);
    const filteredRows = useMemo(
        () => filterPredictions(predictions.data?.data ?? [], filters),
        [predictions.data, filters],
    );
    const matchOptions = useMemo(() => {
        const options = new Map<number, string>();
        matches.data?.data.forEach((match) => options.set(match.id, `#${match.id} ${match.matchName}`));
        predictions.data?.data.forEach((prediction) => {
            if (!options.has(prediction.matchId)) options.set(prediction.matchId, `#${prediction.matchId}`);
        });
        return [...options.entries()].sort(([a], [b]) => b - a);
    }, [matches.data, predictions.data]);
    const hasFilters = filters.matchId !== "" || filters.userId !== "" || filters.history !== "all" || filters.result !== "all" || filters.sort !== "latest";
    const invalidUserId = filters.userId.trim() !== "" && !/^\d+$/.test(filters.userId.trim());

    useEffect(() => {
        if (authLoading) return;
        if (!isLogined) router.replace("/login");
        else if (!isAdmin) router.replace("/");
    }, [authLoading, isLogined, isAdmin, router]);

    if (authLoading) return <LoadingComponent />;
    if (!isAdmin) return null;

    const rows = predictions.data?.data ?? [];

    return (
        <Grid height="100%" minH={0} minW={0} overflowY="auto" templateRows="auto auto auto auto minmax(160px, 1fr)" gap={3}>
            <Stack borderWidth="1px" rounded="sm" p={3} gap={3} maxH="240px" overflowY="auto">
                <Flex justify="space-between" align="center" gap={3}>
                    <Text fontWeight="semibold">경기 정보 및 접수 관리</Text>
                    <MatchCreateDialog />
                </Flex>
                {matches.isPending ? (
                    <Text color="fg.muted">loading match info...</Text>
                ) : matches.isError ? (
                    <Text role="alert" color="red.600">failed to load matchinfo. Please try again later.</Text>
                ) : matches.data?.data.length === 0 ? (
                    <Text color="fg.muted">No match found.</Text>
                ) : matches.data?.data.map((match) => (
                    <Flex key={match.id} justify="space-between" align="center" gap={3} wrap="wrap">
                        <Text fontSize="sm">#{match.id} {match.matchName} ({match.teamA} : {match.teamB})</Text>
                        <Flex gap={3} align="center" wrap="wrap">
                            <MatchInfoEditor match={match} disabled={updateSubmission.isPending || applyGrading.isPending || matches.isFetching} />
                            <Button size="sm" colorPalette="cyan"
                                disabled={match.allowSubmission || updateSubmission.isPending || applyGrading.isPending || matches.isFetching}
                                loading={applyGrading.isPending && applyGrading.variables === match.id}
                                onClick={() => applyGrading.mutate(match.id)}>
                                채점 적용
                            </Button>
                            <Switch.Root
                                colorPalette="green"
                                checked={match.allowSubmission === true}
                                disabled={updateSubmission.isPending || applyGrading.isPending || matches.isFetching}
                                onCheckedChange={({ checked }) => updateSubmission.mutate({
                                    matchId: match.id, allowSubmission: checked,
                                })}
                            >
                                <Switch.HiddenInput aria-label={`${match.matchName} Open Submission`} />
                                <Switch.Control />
                                <Switch.Label>{match.allowSubmission ? "Y" : "N"}</Switch.Label>
                            </Switch.Root>
                        </Flex>
                    </Flex>
                ))}
                {updateSubmission.isError && (
                    <Text role="alert" color="red.600">Failed to change submission toggle status: {updateSubmission.error.message}</Text>
                )}
                <Text fontSize="sm" color="fg.muted">접수 종료 → 실제 점수 저장 → 채점 적용. 전반·최종 각각 A:B를 모두 맞히면 1회 적중(최대 2회)입니다. 점수 수정 후에는 다시 채점 적용을 누르세요.</Text>
                {applyGrading.isError && <Text role="alert" color="red.600">{applyGrading.error.message}</Text>}
                {applyGrading.isSuccess && <Text role="status" color="green.600">경기 #{applyGrading.variables} 채점이 적용되었습니다.</Text>}
            </Stack>
            <TestPredictionForm />
            <Flex gap={3} wrap="wrap" align="end" borderWidth="1px" rounded="sm" p={3}>
                <Field.Root flex="1 1 180px">
                    <Field.Label>경기 ID</Field.Label>
                    <NativeSelect.Root size="sm" width="100%">
                        <NativeSelect.Field
                            value={filters.matchId}
                            onChange={(event) => setFilters({ ...filters, matchId: event.target.value, sort: event.target.value ? filters.sort : "latest" })}
                        >
                            <option value="">전체 경기</option>
                            {matchOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>
                <Field.Root flex="1 1 150px" invalid={invalidUserId}>
                    <Field.Label>사용자 ID</Field.Label>
                    <Input
                        size="sm"
                        inputMode="numeric"
                        placeholder="전체 사용자"
                        value={filters.userId}
                        onChange={(event) => setFilters({ ...filters, userId: event.target.value })}
                    />
                    <Field.ErrorText>사용자 ID는 숫자로 입력해주세요.</Field.ErrorText>
                </Field.Root>
                <Field.Root flex="1 1 180px">
                    <Field.Label>제출 이력</Field.Label>
                    <NativeSelect.Root size="sm" width="100%" disabled={filters.sort === "score"}>
                        <NativeSelect.Field
                            value={filters.history}
                            onChange={(event) => setFilters({ ...filters, history: event.target.value as PredictionFilters["history"] })}
                        >
                            <option value="all">전체 이력</option>
                            <option value="latest">사용자·경기별 최신 제출</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>
                <Field.Root flex="1 1 150px">
                    <Field.Label>예측 결과</Field.Label>
                    <NativeSelect.Root size="sm" width="100%">
                        <NativeSelect.Field
                            value={filters.result}
                            onChange={(event) => setFilters({ ...filters, result: event.target.value as PredictionFilters["result"] })}
                        >
                            <option value="all">전체 결과</option>
                            <option value="pending">미채점</option>
                            <option value="graded">채점됨</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>
                <Field.Root flex="1 1 180px">
                    <Field.Label>정렬</Field.Label>
                    <NativeSelect.Root size="sm" width="100%">
                        <NativeSelect.Field value={filters.sort}
                            onChange={(event) => setFilters({ ...filters, sort: event.target.value as PredictionFilters["sort"], history: event.target.value === "score" ? "latest" : filters.history })}>
                            <option value="latest">최신 제출순</option>
                            <option value="score" disabled={!filters.matchId}>점수 높은 순</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Field.HelperText>경기를 선택하면 점수순으로 정렬할 수 있습니다.</Field.HelperText>
                </Field.Root>
                <Button size="sm" variant="outline" disabled={!hasFilters} onClick={() => setFilters(emptyPredictionFilters)}>
                    필터 초기화
                </Button>
            </Flex>
            <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                <Text color="fg.muted" fontSize="sm" aria-live="polite">
                    {predictions.isSuccess ? `표시 ${filteredRows.length}건 / 전체 ${rows.length}건 · ` : ""}
                    {filters.history === "latest" ? "사용자·경기별 최신 제출" : "수정 이력 포함"} · {filters.sort === "score" ? "적중 수 ↓ · 오차 합 ↑ · 승무패 적중 우선" : "최신 제출순"} · 점수 A : B
                </Text>
                <Button
                    size="sm"
                    variant="outline"
                    rounded="sm"
                    loading={predictions.isFetching || matches.isFetching}
                    onClick={() => { predictions.refetch(); matches.refetch(); }}
                >
                    <HiOutlineRefresh /> 새로고침
                </Button>
            </Flex>

            {predictions.isPending ? (
                <LoadingComponent />
            ) : predictions.isError ? (
                <Text role="alert" color="red.600">
                    예측 목록을 불러오지 못했습니다. 새로고침으로 다시 시도해주세요.
                </Text>
            ) : filteredRows.length === 0 ? (
                <Text color="fg.muted" py={8} textAlign="center">
                    {rows.length === 0 ? "제출된 예측이 없습니다." : "조건에 맞는 예측이 없습니다. 필터를 변경하거나 초기화해주세요."}
                </Text>
            ) : (
                <Table.ScrollArea width="100%" height="100%" maxW="100%">
                    <Table.Root stickyHeader colorPalette="cyan" size="sm" minW="900px">
                        <Table.Caption>승부예측 제출 목록 · {filteredRows.length}건</Table.Caption>
                        <Table.Header>
                            <Table.Row bg="bg.muted">
                                {["예측 ID", "사용자 ID", "경기 ID", "전반 점수", "최종 점수", "전화번호", "제출 시간 (KST)", "적중 수", "오차 합", "승무패"].map((label) => (
                                    <Table.ColumnHeader key={label} whiteSpace="nowrap">
                                        {label}
                                    </Table.ColumnHeader>
                                ))}
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {filteredRows.map((prediction) => (
                                <Table.Row key={prediction.id}>
                                    <Table.Cell>{prediction.id}</Table.Cell>
                                    <Table.Cell>{prediction.userId}</Table.Cell>
                                    <Table.Cell>{prediction.matchId}</Table.Cell>
                                    <Table.Cell whiteSpace="nowrap">{prediction.firstScoreA} : {prediction.firstScoreB}</Table.Cell>
                                    <Table.Cell whiteSpace="nowrap">{prediction.secondScoreA} : {prediction.secondScoreB}</Table.Cell>
                                    <Table.Cell whiteSpace="nowrap">{prediction.phoneNumber || "—"}</Table.Cell>
                                    <Table.Cell whiteSpace="nowrap">{formatSubmitTime(prediction.timeSubmit)}</Table.Cell>
                                    <Table.Cell>{prediction.correctScoreCount ?? "미채점"}</Table.Cell>
                                    <Table.Cell>{prediction.scoreDiffAbs ?? "—"}</Table.Cell>
                                    <Table.Cell>{prediction.isOutcomeCorrect == null ? "—" : prediction.isOutcomeCorrect ? "O" : "X"}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
            )}
        </Grid>
    );
}
