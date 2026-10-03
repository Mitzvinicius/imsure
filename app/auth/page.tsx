import type { Metadata } from "next";
import { Suspense } from "react";
import AuthPage from "./AuthPage";

export const metadata: Metadata = {
    title: "Imsure · Entrar",
};

export default function LoginPage() {
    return (
        <Suspense>
            <AuthPage />
        </Suspense>
    );
}
