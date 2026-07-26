import type { Metadata } from "next";
import AuthPage from "./AuthPage";

export const metadata: Metadata = {
    title: "Imsure · Entrar",
};

export default function LoginPage() {
    return <AuthPage />;
}
