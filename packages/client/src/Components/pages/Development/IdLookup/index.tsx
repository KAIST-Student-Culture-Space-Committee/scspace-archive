"use client";

import { Button, Field, Flex, Input, Stack, Table, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@scspace-client/Hooks/auth";
import LoadingComponent from "@scspace-client/Components/atoms/Loading";
import type { IUser } from "@scspace-depot/types/user";
import type { IOrganizationAll } from "@scspace-depot/types/organization";
import type { ISpace } from "@scspace-depot/types/space";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

type Kind = "user" | "organization" | "space";
const labels = { user: "유저", organization: "조직", space: "공간" };
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function IdLookup({ kind }: { kind: Kind }) {
    const { isAdmin, isLogined, isLoading } = useAuth();
    const router = useRouter();
    const [draft, setDraft] = useState("");
    const [id, setId] = useState<number | null>(null);
    const [inputError, setInputError] = useState("");
    const result = useQuery<IUser | IOrganizationAll | ISpace>({
        queryKey: ["dev-id-lookup", kind, id],
        enabled: isAdmin && !isLoading && id !== null,
        retry: false,
        queryFn: async ({ signal }) => {
            const response = await fetch(`${baseUrl}/${kind}/${id}`, { credentials: "include", signal });
            if (response.status === 404) throw new Error(`ID ${id}에 해당하는 ${labels[kind]}가 없습니다.`);
            if (response.status === 401 || response.status === 403) throw new Error("로그인 상태와 조회 권한을 확인해주세요.");
            if (!response.ok) throw new Error("조회에 실패했습니다. 다시 시도해주세요.");
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            if (!data) throw new Error(`ID ${id}에 해당하는 ${labels[kind]}가 없습니다.`);
            return data;
        },
    });

    useEffect(() => {
        if (!isLoading && !isLogined) router.replace("/login");
        else if (!isLoading && !isAdmin) router.replace("/");
    }, [isLoading, isLogined, isAdmin, router]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const value = draft.trim();
        if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 2147483647) {
            setInputError("ID는 1~2147483647 사이의 정수로 입력해주세요.");
            return;
        }
        setInputError("");
        if (id === Number(value)) void result.refetch();
        else setId(Number(value));
    }

    if (isLoading) return <LoadingComponent />;
    if (!isAdmin) return null;

    const data = result.data;
    const rows: [string, string | number][] = data ? [["ID", data.id]] : [];
    if (data && "studentNumber" in data) {
        rows.push(["이름", data.nameKr?.trim() || data.nameEn || "—"], ["영문 이름", data.nameEn || "—"],
            ["학번 / 사번", data.studentNumber], ["이메일", data.email || "—"], ["권한 코드", data.type]);
    } else if (data && "delegatorId" in data) {
        rows.push(["조직명", data.name], ["상태 코드", data.status], ["방 보유", data.hasRoom ? "예" : "아니오"],
            ["대표자 ID", data.delegatorId], ["대표자 이름", data.delegator?.nameKr?.trim() || data.delegator?.nameEn || "—"],
            ["구성원 수", data.members.length]);
    } else if (data && "spaceType" in data) {
        rows.push(["공간명", data.nameKr], ["영문 이름", data.nameEn], ["공간 유형 코드", data.spaceType]);
    }

    return (
        <Stack gap={4} maxW="720px" width="100%">
            <Text fontWeight="semibold">ID로 {labels[kind]} 찾기</Text>
            <form onSubmit={submit}>
                <Flex gap={3} align="start">
                    <Field.Root invalid={!!inputError}>
                        <Field.Label>{labels[kind]} ID</Field.Label>
                        <Input inputMode="numeric" value={draft} placeholder="ID 입력" aria-label={`${labels[kind]} ID`}
                            onChange={(event) => { setDraft(event.target.value); setInputError(""); }} />
                        <Field.ErrorText>{inputError}</Field.ErrorText>
                    </Field.Root>
                    <Button type="submit" mt={7} loading={result.isFetching}>조회</Button>
                </Flex>
            </form>
            {id === null ? <Text color="fg.muted">ID를 입력하고 조회를 누르세요.</Text> : result.isFetching ? <Text>조회 중입니다.</Text>
                : result.isError ? <Text role="alert" color="red.600">{result.error.message}</Text> : data && (
                    <Table.Root size="sm"><Table.Body>
                        {rows.map(([label, value]) => <Table.Row key={label}><Table.Cell fontWeight="semibold">{label}</Table.Cell><Table.Cell>{value}</Table.Cell></Table.Row>)}
                    </Table.Body></Table.Root>
                )}
        </Stack>
    );
}
