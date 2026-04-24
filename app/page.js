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
        <div className="container">
            <div className="hero">
                <h1>District Football Stats</h1>
                <p>Track and analyze football performance across your district</p>
            </div>

            <div className="auth-section">
                {user ? (
                    <div className="user-info">
                        <h2>Welcome back!</h2>
                        <p>Signed in as <strong>{user.email}</strong></p>
                        <button className="btn btn-secondary" onClick={handleSignOut}>Sign Out</button>
                    </div>
                ) : (
                    <form onSubmit={handleSignIn}>
                        <h2>Sign In</h2>
                        <div className="form-group">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn">Sign In</button>
                        <button type="button" className="btn btn-secondary" onClick={handleSignUp}>Create Account</button>
                        {authMessage && (
                            <div className={`message ${authMessage.includes('error') || authMessage.includes('Unable') ? 'error' : 'success'}`}>
                                {authMessage}
                            </div>
                        )}
                    </form>
                )}
            </div>

            <div className="schools-grid">
                {schools.length === 0 ? (
                    <Link href="/school/weatherford" className="school-card">
                        <h3>Weatherford High School</h3>
                        <p>View football stats and performance data</p>
                    </Link>
                ) : (
                    schools.map(s => (
                        <Link key={s.id} href={`/school/${s.id}`} className="school-card">
                            <h3>{s.name}</h3>
                            <p>View football stats and performance data</p>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}