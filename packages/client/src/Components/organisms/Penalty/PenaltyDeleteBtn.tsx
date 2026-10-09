"use client";

import { Badge } from "@chakra-ui/react";
import AlertBtn from "@scspace-client/Components/atoms/AlertBtn";
import { toaster } from "@scspace-client/Components/atoms/Toaster";
import { useMutationApi } from "@scspace-client/Hooks/api";
import { ISuccessResponse } from "@scspace-depot/types/common";

export default function PenaltyDeleteBtn({ id, onDeleted }: {
    id: number;
    onDeleted: () => void;
}) {
    const { mutateAsync: deletePenalty } = useMutationApi<ISuccessResponse, object>(`/penalty/${id}`, "DELETE");

    function handleDelete() {
        toaster.promise(
            deletePenalty({}).then(() => onDeleted()),
            {
                loading: { title: "삭제중..." },
                success: { title: "삭제되었습니다." },
                error: (err) => ({
                    title: "삭제 실패",
                    description: err instanceof Error ? err.message : "다시 시도해주세요.",
                }),
            }
        );
    }

    return (
        <AlertBtn
            onClick={handleDelete}
            colorPalette="red"
            buttonText="Delete"
            dialogTitle="Are you sure?"
            dialogBody="이 이력을 삭제하면 이후 누적과 제한이 다시 계산되고 취소 메일이 발송됩니다."
        >
            <Badge colorPalette="red" variant={{ base: "subtle", _hover: "solid" }} cursor="pointer">
                Delete
            </Badge>
        </AlertBtn>
    );
}
