"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function HomePage() {
    const [schools, setSchools] = useState([]);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [user, setUser] = useState(null);
    const [authMessage, setAuthMessage] = useState("");

    useEffect(() => {
        loadSchools();
        initAuth();
    }, []);

    async function loadSchools() {
        const { data } = await supabase.from("schools").select("*");
        setSchools(data || []);
    }

    async function initAuth() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Auth getSession error:", error);
            setAuthMessage("Unable to load auth session.");
        }

        const user = session?.user ?? null;
        console.log("Authenticated user ID:", user?.id);
        setUser(user);
        if (user) {
            setAuthMessage(`Signed in as ${user.email}`);
        }

        supabase.auth.onAuthStateChange((event, session) => {
            const nextUser = session?.user ?? null;
            console.log("Auth event:", event, nextUser?.id);
            setUser(nextUser);
            if (nextUser) {
                setAuthMessage(`Signed in as ${nextUser.email}`);
            } else {
                setAuthMessage("Signed out.");
            }
        });
    }

    async function handleSignIn(e) {
        e.preventDefault();
        setAuthMessage("Signing in...");

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("Sign in error:", error);
            setAuthMessage(error.message);
            return;
        }

        setUser(data.user);
        setAuthMessage(`Signed in as ${data.user?.email}`);
    }

    async function handleSignUp(e) {
        e.preventDefault();
        setAuthMessage("Creating account...");

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            console.error("Sign up error:", error);
            setAuthMessage(error.message);
            return;
        }

        setUser(data.user);
        setAuthMessage(`Account created for ${data.user?.email}.`);
    }

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Sign out error:", error);
            setAuthMessage(error.message);
            return;
        }
        setUser(null);
        setEmail("");
        setPassword("");
        setAuthMessage("Signed out.");
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>Football Stats</h1>

            <div style={{ marginBottom: 30 }}>
                {user ? (
                    <div>
                        <p>Signed in as <strong>{user.email}</strong> (ID: {user.id})</p>
                        <button onClick={handleSignOut}>Sign Out</button>
                    </div>
                ) : (
                    <form onSubmit={handleSignIn} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
                        <h2>Sign in to Supabase</h2>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit">Sign In</button>
                        <button type="button" onClick={handleSignUp}>Create Account</button>
                        {authMessage && <p>{authMessage}</p>}
                    </form>
                )}
            </div>

            {schools.length === 0 ? (
                <Link href="/school/weatherford">
                    <button>Go to Weatherford High School</button>
                </Link>
            ) : (
                schools.map(s => (
                    <div key={s.id}>
                        <Link href={`/school/${s.id}`}>{s.name}</Link>
                    </div>
                ))
            )}
        </div>
    );
}