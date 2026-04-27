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
    const [resendEmail, setResendEmail] = useState("");

    useEffect(() => {
        loadSchools();
        initAuth();
    }, []);

    // Add debugging for auth state changes
    useEffect(() => {
        console.log("Current user state:", user ? `Logged in as ${user.email}` : "Not logged in");
    }, [user]);

    async function loadSchools() {
        const { data } = await supabase.from("schools").select("*");
        setSchools(data || []);
    }

    async function initAuth() {
        // First check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Auth getSession error:", error);
            setAuthMessage("Unable to load auth session.");
        } else {
            const user = session?.user ?? null;
            console.log("Initial session user ID:", user?.id);
            setUser(user);
            if (user) {
                setAuthMessage(`Signed in as ${user.email}`);
            }
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log("Auth state change:", event, session?.user?.id);
                const nextUser = session?.user ?? null;
                setUser(nextUser);

                if (event === 'SIGNED_IN') {
                    setAuthMessage(`Signed in as ${nextUser?.email}`);
                } else if (event === 'SIGNED_OUT') {
                    setAuthMessage("Signed out.");
                    setEmail("");
                    setPassword("");
                } else if (event === 'TOKEN_REFRESHED') {
                    console.log("Token refreshed");
                }
            }
        );

        // Cleanup subscription on unmount
        return () => subscription.unsubscribe();
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
            if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
                setAuthMessage("Please check your email and click the confirmation link before signing in. If you didn't receive the email, use the resend option below.");
            } else if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
                setAuthMessage("Invalid email or password. Please check your credentials or create a new account if you haven't already.");
            } else if (error.message.includes('Too many requests')) {
                setAuthMessage("Too many sign-in attempts. Please wait a few minutes before trying again.");
            } else {
                setAuthMessage(`Sign in failed: ${error.message}`);
            }
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
            options: {
                emailRedirectTo: `${window.location.origin}`
            }
        });

        if (error) {
            console.error("Sign up error:", error);
            setAuthMessage(error.message);
            return;
        }

        if (data.user && !data.session) {
            setAuthMessage("Account created! Please check your email and click the confirmation link to activate your account. You won't be able to sign in until you confirm your email.");
        } else if (data.session) {
            setUser(data.user);
            setAuthMessage(`Account created and signed in as ${data.user?.email}`);
        } else {
            setAuthMessage("Account creation initiated. Please check your email for a confirmation link.");
        }
    }

    async function handleResendConfirmation(e) {
        e.preventDefault();
        setAuthMessage("Sending confirmation email...");

        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: resendEmail,
        });

        if (error) {
            console.error("Resend error:", error);
            setAuthMessage(error.message);
            return;
        }

        setAuthMessage("Confirmation email sent! Please check your email.");
        setResendEmail("");
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
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                            <strong>Important:</strong> After creating an account, check your email and click the confirmation link before signing in.
                        </p>
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

                        <div style={{ marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={async () => {
                                    const { data: { session }, error } = await supabase.auth.getSession();
                                    console.log("Current session:", session);
                                    console.log("Session error:", error);
                                    alert(session ? `Session active for ${session.user.email}` : "No active session");
                                }}
                                style={{ fontSize: '12px', padding: '5px 10px', backgroundColor: '#e9ecef', border: '1px solid #ced4da', borderRadius: '3px', cursor: 'pointer' }}
                            >
                                Check Auth Status
                            </button>
                        </div>

                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Didn't receive confirmation email?</h4>
                            <form onSubmit={handleResendConfirmation} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={resendEmail}
                                    onChange={(e) => setResendEmail(e.target.value)}
                                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '3px' }}
                                    required
                                />
                                <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                                    Resend
                                </button>
                            </form>
                        </div>

                        {authMessage && (
                            <div className={`message ${authMessage.includes('error') || authMessage.includes('Unable') || authMessage.includes('Invalid') ? 'error' : 'success'}`}>
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
                            {s.logo_url && (
                                <img 
                                    src={s.logo_url} 
                                    alt={`${s.name} logo`}
                                    className="school-logo"
                                />
                            )}
                            <h3>{s.name}</h3>
                            <p>View football stats and performance data</p>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}