"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function SchoolPage({ params }) {
    const [roster, setRoster] = useState([]);
    const [games, setGames] = useState([]);
    const [schoolLogo, setSchoolLogo] = useState(null);
    const [playerStats, setPlayerStats] = useState([]);
    const [selectedGame, setSelectedGame] = useState('');

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

    // Stats form state
    const [statsForm, setStatsForm] = useState({});

    // File upload states
    const [logoFile, setLogoFile] = useState(null);
    const [rosterFile, setRosterFile] = useState(null);

    useEffect(() => {
        loadRoster();
        loadGames();
        loadSchoolLogo();
    }, []);

    useEffect(() => {
        if (roster.length > 0 && selectedGame) {
            loadPlayerStats(selectedGame);
        }
    }, [roster, selectedGame]);

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

    async function loadPlayerStats(gameId) {
        const { data } = await supabase
            .from("player_stats")
            .select("*, athletes(number, first_name, last_name, position)")
            .eq("game_id", gameId);

        const statsMap = {};
        data?.forEach(stat => {
            statsMap[stat.athlete_id] = {
                receptions: stat.receptions || 0,
                yards: stat.yards || 0,
                fumbles: stat.fumbles || 0
            };
        });

        // Initialize stats for all players, even if they don't have stats yet
        roster.forEach(player => {
            if (!statsMap[player.id]) {
                statsMap[player.id] = { receptions: 0, yards: 0, fumbles: 0 };
            }
        });

        setStatsForm(statsMap);
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

    async function savePlayerStats(e) {
        e.preventDefault();
        if (!selectedGame) return;

        // For now, using a hardcoded school_id. In production, this would come from auth or school context
        const schoolId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual school_id

        const statsToInsert = Object.entries(statsForm)
            .filter(([_, stats]) => stats.receptions > 0 || stats.yards > 0 || stats.fumbles > 0)
            .map(([athleteId, stats]) => ({
                athlete_id: athleteId,
                game_id: selectedGame,
                school_id: schoolId,
                receptions: parseInt(stats.receptions) || 0,
                yards: parseInt(stats.yards) || 0,
                fumbles: parseInt(stats.fumbles) || 0
            }));

        if (statsToInsert.length === 0) {
            alert('No stats to save');
            return;
        }

        // First, delete existing stats for this game to avoid duplicates
        await supabase
            .from("player_stats")
            .delete()
            .eq("game_id", selectedGame);

        const { error } = await supabase
            .from("player_stats")
            .insert(statsToInsert);

        if (error) {
            alert('Error saving stats: ' + error.message);
        } else {
            alert('Stats saved successfully!');
            loadPlayerStats(selectedGame);
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

            <h2>Enter Game Stats</h2>
            <div style={{ marginBottom: 20 }}>
                <select
                    value={selectedGame}
                    onChange={(e) => {
                        setSelectedGame(e.target.value);
                        if (e.target.value) loadPlayerStats(e.target.value);
                    }}
                    style={{ marginRight: 10 }}
                >
                    <option value="">Select a Game</option>
                    {games.map(g => (
                        <option key={g.id} value={g.id}>
                            {g.game_date} vs {g.opponent}
                        </option>
                    ))}
                </select>
            </div>

            {selectedGame && (
                <form onSubmit={savePlayerStats}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f0f0f0' }}>
                                <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Player</th>
                                <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Position</th>
                                <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Receptions</th>
                                <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Yards</th>
                                <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Fumbles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roster.map(player => (
                                <tr key={player.id}>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                        {player.number} - {player.first_name} {player.last_name}
                                    </td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                        {player.position}
                                    </td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={statsForm[player.id]?.receptions || 0}
                                            onChange={(e) => setStatsForm({
                                                ...statsForm,
                                                [player.id]: {
                                                    ...statsForm[player.id],
                                                    receptions: e.target.value
                                                }
                                            })}
                                            style={{ width: '60px' }}
                                        />
                                    </td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={statsForm[player.id]?.yards || 0}
                                            onChange={(e) => setStatsForm({
                                                ...statsForm,
                                                [player.id]: {
                                                    ...statsForm[player.id],
                                                    yards: e.target.value
                                                }
                                            })}
                                            style={{ width: '60px' }}
                                        />
                                    </td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={statsForm[player.id]?.fumbles || 0}
                                            onChange={(e) => setStatsForm({
                                                ...statsForm,
                                                [player.id]: {
                                                    ...statsForm[player.id],
                                                    fumbles: e.target.value
                                                }
                                            })}
                                            style={{ width: '60px' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="submit">Save Stats</button>
                </form>
            )}
        </div>
    );
}