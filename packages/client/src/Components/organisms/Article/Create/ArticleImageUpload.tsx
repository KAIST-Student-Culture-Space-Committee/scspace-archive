"use client"

import {
    Box,
    Button,
    Center,
    Field,
    FileUpload,
    HStack,
    IconButton,
    Stack,
    Text,
    useFileUploadContext,
    UseFileUploadReturn,
} from "@chakra-ui/react"
import { useEffect, useState } from "react";
import { HiMinus, HiPlus, HiX } from "react-icons/hi";
import { LuFileImage } from "react-icons/lu"

function ImageUploadList() {
    const fileUpload = useFileUploadContext();
    const files = fileUpload.acceptedFiles;

    const [select, setSelect] = useState<number>(0);
    useEffect(() => {
        setSelect((prev) => (prev >= files.length ? files.length - 1 : 0));
    }, [files.length]);

    if (files.length === 0) return null;

    const exchangeImages = async (from: number, to: number) => {
        if (from < 0 || from >= files.length || to < 0 || to >= files.length) return;
        const newFiles = [...files];
        const temp = newFiles[from];
        newFiles[from] = newFiles[to];
        newFiles[to] = temp;

        fileUpload.setFiles(newFiles);
    }

    return (
        <Center
            overflowX="hidden"
            minH={0}
            w="100%"
            maxW="100%"
            whiteSpace="nowrap"
        >
            <FileUpload.ItemGroup asChild>
            <HStack w="fit-content" minWidth="max-content" h="450px">
                <Box
                    key={`empty-before`}
                    w={`${248 * (files.length - select - 1) + 8}px`}
                    // h={'100px'}
                    transition={"all"}
                    transitionDuration={"moderate"}
                // background={"gray.200"}
                />
                {files.map((file, idx) => (
                    <FileUpload.Item
                        w={(select === idx ? "360px" : "240px")}
                        h={(select === idx ? "450px" : "300px")}
                        maxW={"72svw"}
                        maxH={"96svw"}
                        file={file}
                        key={`${file.name}-${idx}`}
                        justifyContent={"center"}
                        alignContent={"center"}
                        onClick={() => setSelect(idx)}
                        transition={"all"}
                        transitionDuration={"moderate"}
                        border={0}
                        background={"gray.50"}
                        p={0}
                    >
                        <FileUpload.ItemPreviewImage
                            maxH={"full"}
                            maxW={"full"}
                        />
                        <Box position={"absolute"} top={2} right={2}>
                            <FileUpload.ItemDeleteTrigger asChild>
                                <IconButton size={"xs"} variant={"ghost"}>
                                    <HiX />
                                </IconButton>
                            </FileUpload.ItemDeleteTrigger>
                        </Box>
                        <Box position={"absolute"} bottom={2}
                            display={(idx === select) ? "block" : "none"}
                            transition={"all"}
                            transitionDuration={"moderate"}
                        >
                            <HStack
                                backdropFilter="blur(8px)"
                                background="rgba(255,255,255,0.3)"
                                rounded={"md"}
                            >
                                <IconButton
                                    size={"xs"}
                                    variant={"ghost"}
                                    disabled={idx === 0}
                                    onClick={async () => {
                                        exchangeImages(idx, idx - 1).then(() => {
                                            setSelect(idx - 1);
                                        });
                                    }}
                                >
                                    <HiMinus />
                                </IconButton>
                                <Text fontWeight={"semibold"}>
                                    {idx + 1}
                                </Text>
                                <IconButton
                                    size={"xs"}
                                    variant={"ghost"}
                                    disabled={idx === files.length - 1}
                                    onClick={async () => {
                                        exchangeImages(idx, idx + 1).then(() => {
                                            setSelect(idx + 1);
                                        });
                                    }}
                                >
                                    <HiPlus />
                                </IconButton>
                            </HStack>
                        </Box>
                    </FileUpload.Item>
                ))}
                <Box
                    key={`empty-after`}
                    w={`${248 * (select) + 8}px`}
                    // h={'100px'}
                    transition={"all"}
                    transitionDuration={"moderate"}
                // background={"gray.200"}
                />
            </HStack>
            </FileUpload.ItemGroup>
        </Center >
    )
}

export default function ArticleImageUpload({ imageUpload }: { imageUpload: UseFileUploadReturn }) {
    return (
        <FileUpload.RootProvider
            value={imageUpload}
        >
            <FileUpload.HiddenInput />
            <Field.Root
                required
                invalid={
                    imageUpload.acceptedFiles &&
                    imageUpload.acceptedFiles.length > 0 &&
                    imageUpload.acceptedFiles[0].size > 10 * 1024 * 1024
                }
            >
                <Field.Label>
                    Images
                    <Field.RequiredIndicator />
                </Field.Label>
                <FileUpload.Trigger asChild>
                    <Button variant="outline" width={"full"}>
                        <LuFileImage /> Upload Images
                    </Button>
                </FileUpload.Trigger>
                <Field.ErrorText>
                    이미지의 크기는 10MB를 초과할 수 없습니다.
                </Field.ErrorText>
            </Field.Root>
            <ImageUploadList />
        </FileUpload.RootProvider>
    )
}
