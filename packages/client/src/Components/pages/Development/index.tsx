"use client"

import React from "react";
import { useAuth } from "@scspace-client/Hooks/auth";
import PageSelector, { IPage } from "../../molecules/page/PageSelector";
import Atoms from "./Atoms";
import Molecules from "./Molecules";
import TestPage from "./Test";
import IdLookup from "./IdLookup";

export default function Development() {
    const { needAdmin } = useAuth();
    // needAdmin();

    const pages: IPage[] = [
        { kor: "ID로 유저 찾기", eng: "Find User by ID", preview: <IdLookup kind="user" />, href: "/dev/find-user" },
        { kor: "ID로 조직 찾기", eng: "Find Organization by ID", preview: <IdLookup kind="organization" />, href: "/dev/find-organization" },
        { kor: "ID로 공간 찾기", eng: "Find Space by ID", preview: <IdLookup kind="space" />, href: "/dev/find-space" },
        {
            kor: "Atoms",
            eng: "Components",
            preview: <Atoms />,
            href: "/dev/atoms"
        },
        {
            kor: "Molecules",
            eng: "Components",
            preview: <Molecules />,
            href: "/dev/molecules"
        },
        {
            kor: "Test",
            eng: "For Local Test",
            preview: <TestPage />,
            href: "/dev/test"
        }
    ]

    return (
        <PageSelector
            pages={pages}
        />
    );
}
