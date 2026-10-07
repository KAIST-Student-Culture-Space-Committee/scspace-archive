"use client"

import {
    Box,
    Button,
    Center,
    Field,
    FileUpload,
    HStack,
    IconButton,
    useFileUploadContext,
    UseFileUploadReturn,
    Wrap,
} from "@chakra-ui/react"
import { useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
import { LuFileImage } from "react-icons/lu"

function FileUploadList() {
    const fileUpload = useFileUploadContext();
    const files = fileUpload.acceptedFiles;

    const [select, setSelect] = useState<number>(0);
    useEffect(() => {
        setSelect((prev) => (prev >= files.length ? files.length - 1 : 0));
    }, [files.length]);

    if (files.length === 0) return null;

    return (
        <FileUpload.ItemGroup asChild>
            <Wrap>
                {files.map((file, idx) => (
                    <FileUpload.Item
                        w={"fit-content"}
                        file={file}
                        key={`${file.name}-${idx}`}
                    >
                        {file.name}
                        <FileUpload.ItemDeleteTrigger asChild>
                            <IconButton size={"sm"} variant={"ghost"}>
                                <HiX />
                            </IconButton>
                        </FileUpload.ItemDeleteTrigger>
                    </FileUpload.Item>
                ))}
            </Wrap>
        </FileUpload.ItemGroup>
    )
}

export default function ArticleFileUpload({ fileUpload }: { fileUpload: UseFileUploadReturn }) {
    return (
        <FileUpload.RootProvider
            value={fileUpload}
        >
            <FileUpload.HiddenInput />
            <Field.Root
                required
                invalid={
                    fileUpload.acceptedFiles &&
                    fileUpload.acceptedFiles.length > 0 &&
                    fileUpload.acceptedFiles[0].size > 10 * 1024 * 1024
                }
            >
                <Field.Label>
                    Uploaded Files
                    <Field.RequiredIndicator />
                </Field.Label>
                <FileUpload.Trigger asChild>
                    <Button variant="outline" width={"full"}>
                        <LuFileImage /> Upload File
                    </Button>
                </FileUpload.Trigger>
                <Field.ErrorText>
                    파일의 크기는 10MB를 초과할 수 없습니다.
                </Field.ErrorText>
            </Field.Root>
            <FileUploadList />
        </FileUpload.RootProvider>
    )
}
