"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function SchoolPage({ params }) {
    const [roster, setRoster] = useState([]);
    const [games, setGames] = useState([]);
    const [schoolLogo, setSchoolLogo] = useState(null);

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

    // File upload states
    const [logoFile, setLogoFile] = useState(null);
    const [rosterFile, setRosterFile] = useState(null);

    useEffect(() => {
        loadRoster();
        loadGames();
        loadSchoolLogo();
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

    async function loadSchoolLogo() {
        // For now, we'll assume a fixed path. In a real app, this would be stored in a schools table
        const { data } = await supabase.storage
            .from('logos')
            .list('', {
                search: 'weatherford-logo'
            });

        if (data && data.length > 0) {
            const { data: urlData } = supabase.storage
                .from('logos')
                .getPublicUrl(data[0].name);
            setSchoolLogo(urlData.publicUrl);
        }
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

    async function uploadLogo(e) {
        e.preventDefault();
        if (!logoFile) return;

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `weatherford-logo.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('logos')
            .upload(fileName, logoFile, {
                upsert: true
            });

        if (error) {
            alert('Error uploading logo: ' + error.message);
        } else {
            alert('Logo uploaded successfully!');
            loadSchoolLogo();
            setLogoFile(null);
        }
    }

    async function uploadRoster(e) {
        e.preventDefault();
        if (!rosterFile) return;

        const text = await rosterFile.text();
        const lines = text.split('\n').filter(line => line.trim());

        // Assume CSV format: number,first_name,last_name,position
        const athletes = lines.slice(1).map(line => {
            const [number, first_name, last_name, position] = line.split(',');
            return {
                number: parseInt(number.trim()),
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                position: position.trim()
            };
        });

        const { data, error } = await supabase
            .from("athletes")
            .insert(athletes)
            .select();

        if (error) {
            alert('Error uploading roster: ' + error.message);
        } else {
            alert('Roster uploaded successfully!');
            loadRoster();
            setRosterFile(null);
        }
    }

    return (
        <div style={{ padding: 20 }}>
            <Link href="/">
                <button style={{ marginBottom: 20 }}>← Back to Schools</button>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                {schoolLogo && (
                    <img
                        src={schoolLogo}
                        alt="School Logo"
                        style={{ width: 80, height: 80, marginRight: 20 }}
                    />
                )}
                <h1>Weatherford High School Football</h1>
            </div>

            <div style={{ marginBottom: 30 }}>
                <h2>Upload School Logo</h2>
                <form onSubmit={uploadLogo}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                        required
                    />
                    <button type="submit">Upload Logo</button>
                </form>
            </div>

            <div style={{ marginBottom: 30 }}>
                <h2>Upload Roster (CSV)</h2>
                <p>CSV format: number,first_name,last_name,position</p>
                <form onSubmit={uploadRoster}>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setRosterFile(e.target.files[0])}
                        required
                    />
                    <button type="submit">Upload Roster</button>
                </form>
            </div>

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