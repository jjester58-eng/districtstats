"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const dynamic = 'force-dynamic';

export default function Home() {
    const [roster, setRoster] = useState([]);
    const [games, setGames] = useState([]);

    useEffect(() => {
        loadRoster();
        loadGames();
    }, []);

    async function loadRoster() {
        const { data } = await supabase
            .from("athletes")
            .select("*")
            .order("number");

        setRoster(data || []);
    }

    async function loadGames() {
        const { data } = await supabase
            .from("games")
            .select("*")
            .order("game_date");

        setGames(data || []);
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>Weatherford Football Stats</h1>

            <h2>Roster</h2>
            {roster.map(a => (
                <div key={a.id}>
                    {a.number} — {a.first_name} {a.last_name} ({a.position})
                </div>
            ))}

            <h2>Games</h2>
            {games.map(g => (
                <div key={g.id}>
                    {g.game_date} vs {g.opponent} ({g.home ? "Home" : "Away"})
                </div>
            ))}
        </div>
    );
}
