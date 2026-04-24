"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function HomePage() {
    const [schools, setSchools] = useState([]);

    useEffect(() => {
        loadSchools();
    }, []);

    async function loadSchools() {
        const { data } = await supabase.from("schools").select("*");
        setSchools(data || []);
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>Football Stats</h1>
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