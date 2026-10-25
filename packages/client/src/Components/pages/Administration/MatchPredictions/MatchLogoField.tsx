"use client";

import { Box, Field, Image, Input, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { matchImageUrl } from "@scspace-client/Hooks/match";

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

export default function MatchLogoField({ label, file, current, required, disabled, maxMB = 5, previewSize = { w: "72px", h: "72px" }, onChange }: {
    label: string;
    file: File | null;
    current?: string | null;
    required?: boolean;
    disabled?: boolean;
    maxMB?: number;
    previewSize?: { w: string; h: string };
    onChange: (file: File | null) => void;
}) {
    const [error, setError] = useState("");
    const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
    const src = preview ?? (current ? matchImageUrl(current) : null);

    function select(selected: File | undefined) {
        setError("");
        if (!selected) return onChange(null);
        if (!ACCEPT.split(",").includes(selected.type)) return setError("JPG, PNG, GIF, WEBP 이미지만 선택할 수 있습니다.");
        if (selected.size > maxMB * 1024 * 1024) return setError(`이미지는 ${maxMB}MB 이하여야 합니다.`);
        onChange(selected);
    }

    return (
        // Not `required` on the field: that would put a native `required` on the file input.
        // Presence is enforced by the parent through `file` state.
        <Field.Root invalid={!!error}>
            <Field.Label>{label}{required && <Text as="span" color="red.500"> *</Text>}</Field.Label>
            <Box w={previewSize.w} h={previewSize.h} borderWidth="1px" rounded="md" display="flex" alignItems="center" justifyContent="center" overflow="hidden">
                {src ? <Image src={src} alt={label} boxSize="full" objectFit="contain" /> : <Text fontSize="xs" color="fg.muted">로고 없음</Text>}
            </Box>
            <Input type="file" accept={ACCEPT} size="sm" p={1} disabled={disabled}
                aria-label={label} onChange={(event) => select(event.target.files?.[0])} />
            {error && <Field.ErrorText>{error}</Field.ErrorText>}
        </Field.Root>
    );
}
