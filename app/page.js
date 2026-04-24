"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const dynamic = 'force-dynamic';

export default function Home() {
    const [roster, setRoster] = useState([]);
    const [games, setGames] = useState([]);

    // Form states
    const [athleteForm, setAthleteForm] = useState({
        number: '',
        first_name: '',
        last_name: '',
        position: ''
    });
    const [gameForm, setGameForm] = useState({
        game_date: '',
        opponent: '',
        home: true
    });

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

    async function addAthlete(e) {
        e.preventDefault();
        const { data, error } = await supabase
            .from("athletes")
            .insert([athleteForm])
            .select();

        if (error) {
            alert('Error adding athlete: ' + error.message);
        } else {
            setAthleteForm({ number: '', first_name: '', last_name: '', position: '' });
            loadRoster();
        }
    }

    async function addGame(e) {
        e.preventDefault();
        const { data, error } = await supabase
            .from("games")
            .insert([gameForm])
            .select();

        if (error) {
            alert('Error adding game: ' + error.message);
        } else {
            setGameForm({ game_date: '', opponent: '', home: true });
            loadGames();
        }
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>Weatherford Football Stats</h1>

            <h2>Add Athlete</h2>
            <form onSubmit={addAthlete} style={{ marginBottom: 20 }}>
                <input
                    type="number"
                    placeholder="Number"
                    value={athleteForm.number}
                    onChange={(e) => setAthleteForm({...athleteForm, number: e.target.value})}
                    required
                />
                <input
                    type="text"
                    placeholder="First Name"
                    value={athleteForm.first_name}
                    onChange={(e) => setAthleteForm({...athleteForm, first_name: e.target.value})}
                    required
                />
                <input
                    type="text"
                    placeholder="Last Name"
                    value={athleteForm.last_name}
                    onChange={(e) => setAthleteForm({...athleteForm, last_name: e.target.value})}
                    required
                />
                <input
                    type="text"
                    placeholder="Position"
                    value={athleteForm.position}
                    onChange={(e) => setAthleteForm({...athleteForm, position: e.target.value})}
                    required
                />
                <button type="submit">Add Athlete</button>
            </form>

            <h2>Add Game</h2>
            <form onSubmit={addGame} style={{ marginBottom: 20 }}>
                <input
                    type="date"
                    value={gameForm.game_date}
                    onChange={(e) => setGameForm({...gameForm, game_date: e.target.value})}
                    required
                />
                <input
                    type="text"
                    placeholder="Opponent"
                    value={gameForm.opponent}
                    onChange={(e) => setGameForm({...gameForm, opponent: e.target.value})}
                    required
                />
                <label>
                    <input
                        type="checkbox"
                        checked={gameForm.home}
                        onChange={(e) => setGameForm({...gameForm, home: e.target.checked})}
                    />
                    Home Game
                </label>
                <button type="submit">Add Game</button>
            </form>

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
