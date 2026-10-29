"use client";

import { Button, Flex, Input } from "@chakra-ui/react";
import { useState } from "react";
import { mtGraphemes } from "@scspace-depot/consts/mt.const";
import { mtColors } from "./shared";

/**
 * Grapheme-truncated in onChange because maxLength misbehaves with Hangul composition on mobile.
 * Sends only on button/Enter so half-composed syllables never reach the server.
 */
export default function NicknameInput({ max, buttonLabel, placeholder, disabled, onSubmit }: {
    max: number;
    buttonLabel: string;
    placeholder?: string;
    disabled?: boolean;
    onSubmit: (value: string, clear: () => void) => void;
}) {
    const [value, setValue] = useState("");
    const submit = () => {
        if (value && !disabled) onSubmit(value, () => setValue(""));
    };
    return <Flex gap={2} w="full">
        <Input
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(mtGraphemes(e.target.value).slice(0, max).join(""))}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submit(); }}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            h="56px" fontSize="20px" bg={mtColors.surface} color={mtColors.text} borderColor={mtColors.orange}
        />
        <Button h="56px" px={6} bg={mtColors.orange} color="black" fontWeight="bold" disabled={disabled || !value} onClick={submit}>
            {buttonLabel}
        </Button>
    </Flex>;
}
