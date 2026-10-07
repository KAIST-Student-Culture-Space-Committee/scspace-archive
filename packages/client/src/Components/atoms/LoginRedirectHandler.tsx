"use client";

import { useEffect } from "react";
import { useAuth } from "@scspace-client/Hooks/auth";
import { useLinkPush } from "@scspace-client/Hooks/api";

export default function LoginRedirectHandler() {
    const { isLogined, isLoading } = useAuth();
    const { linkPush } = useLinkPush();

    useEffect(() => {
        if (isLoading || !isLogined) return;
        const redirect = sessionStorage.getItem("loginRedirect");
        if (redirect) {
            sessionStorage.removeItem("loginRedirect");
            linkPush(redirect);
        }
    }, [isLogined, isLoading, linkPush]);

    return null;
}
