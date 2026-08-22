'use server'

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function createNewUser({
    nome,
    email,
    password,
}: {
    nome: string;
    email: string;
    password: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { nome },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_HOST}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

export async function signIn({
    email,
    password,
}: {
    email: string;
    password: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}
