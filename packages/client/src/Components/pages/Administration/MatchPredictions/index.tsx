"use client";

import { Button, Flex, Grid, Table, Text } from "@chakra-ui/react";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useAllMatchPredictions } from "@scspace-client/Hooks/match";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HiOutlineRefresh } from "react-icons/hi";

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

    useEffect(() => {
        if (authLoading) return;
        if (!isLogined) router.replace("/login");
        else if (!isAdmin) router.replace("/");
    }, [authLoading, isLogined, isAdmin, router]);

    if (authLoading) return <LoadingComponent />;
    if (!isAdmin) return null;

    const rows = predictions.data?.data ?? [];

    return (
        <Grid height="100%" minH={0} minW={0} templateRows="auto minmax(0, 1fr)" gap={3}>
            <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                <Text color="fg.muted" fontSize="sm" aria-live="polite">
                    {predictions.isSuccess ? `전체 ${rows.length}건 · ` : ""}
                    수정 이력 포함 · 최신 제출순 · 점수 A : B
                </Text>
                <Button
                    size="sm"
                    variant="outline"
                    rounded="sm"
                    loading={predictions.isFetching}
                    onClick={() => predictions.refetch()}
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
            ) : rows.length === 0 ? (
                <Text color="fg.muted" py={8} textAlign="center">
                    제출된 예측이 없습니다.
                </Text>
            ) : (
                <Table.ScrollArea width="100%" height="100%" maxW="100%">
                    <Table.Root stickyHeader colorPalette="cyan" size="sm" minW="900px">
                        <Table.Caption>전체 경기 예측 제출 이력</Table.Caption>
                        <Table.Header>
                            <Table.Row bg="bg.muted">
                                {["예측 ID", "사용자 ID", "경기 ID", "전반 점수", "후반 점수", "전화번호", "제출 시간 (KST)", "예측 결과"].map((label) => (
                                    <Table.ColumnHeader key={label} whiteSpace="nowrap">
                                        {label}
                                    </Table.ColumnHeader>
                                ))}
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {rows.map((prediction) => (
                                <Table.Row key={prediction.id}>
                                    <Table.Cell>{prediction.id}</Table.Cell>
                                    <Table.Cell>{prediction.userId}</Table.Cell>
                                    <Table.Cell>{prediction.matchId}</Table.Cell>
                                    <Table.Cell whiteSpace="nowrap">{prediction.firstScoreA} : {prediction.firstScoreB}</Table.Cell>
                                    <Table.Cell whiteSpace="nowrap">{prediction.secondScoreA} : {prediction.secondScoreB}</Table.Cell>
                                    <Table.Cell whiteSpace="nowrap">{prediction.phoneNumber || "—"}</Table.Cell>
                                    <Table.Cell whiteSpace="nowrap">{formatSubmitTime(prediction.timeSubmit)}</Table.Cell>
                                    <Table.Cell>{prediction.predictionResult ?? "미반영"}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
            )}
        </Grid>
    );
}
