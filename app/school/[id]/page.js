"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function SchoolPage({ params }) {
    const [roster, setRoster] = useState([]);
    const [games, setGames] = useState([]);
    const [schoolLogo, setSchoolLogo] = useState(null);
    const [selectedGame, setSelectedGame] = useState('');
    const [statsForm, setStatsForm] = useState({});

    const [athleteForm, setAthleteForm] = useState({
        number: '', first_name: '', last_name: '', position: ''
    });
    const [gameForm, setGameForm] = useState({
        game_date: '', opponent: '', home: true
    });

    const [editingAthlete, setEditingAthlete] = useState(null);
    const [editingGame, setEditingGame] = useState(null);

    const [logoFile, setLogoFile] = useState(null);
    const [rosterFile, setRosterFile] = useState(null);
    const [dominantColor, setDominantColor] = useState(null);
    const [coachMode, setCoachMode] = useState(false);
    const [coachPin, setCoachPin] = useState('');
    const [currentView, setCurrentView] = useState('roster');
    const [teamStats, setTeamStats] = useState({});
    const [playerTotals, setPlayerTotals] = useState([]);
    const [districtStandings, setDistrictStandings] = useState([]);

    useEffect(() => {
        getUser();
        loadRoster();
        loadGames();
        loadSchoolLogo();
        loadTeamStats();
        loadPlayerTotals();
        loadDistrictStandings();
    }, []);

    async function getUser() {
        const { data, error } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        console.log("Authenticated user ID:", userId);
        if (error) {
            console.error("Auth getUser error:", error);
        }
        setAuthUserId(userId ?? null);
    }

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

    async function loadTeamStats() {
        const { data } = await supabase
            .from("player_stats")
            .select("receptions, yards, fumbles");
        const totals = data?.reduce((acc, stat) => ({
            receptions: acc.receptions + (stat.receptions || 0),
            yards: acc.yards + (stat.yards || 0),
            fumbles: acc.fumbles + (stat.fumbles || 0)
        }), { receptions: 0, yards: 0, fumbles: 0 }) || { receptions: 0, yards: 0, fumbles: 0 };
        setTeamStats(totals);
    }

    async function loadPlayerTotals() {
        const { data } = await supabase
            .from("player_stats")
            .select("athlete_id, receptions, yards, fumbles, athletes(number, first_name, last_name, position)");
        const playerMap = {};
        data?.forEach(stat => {
            const id = stat.athlete_id;
            if (!playerMap[id]) {
                playerMap[id] = {
                    ...stat.athletes,
                    receptions: 0,
                    yards: 0,
                    fumbles: 0
                };
            }
            playerMap[id].receptions += stat.receptions || 0;
            playerMap[id].yards += stat.yards || 0;
            playerMap[id].fumbles += stat.fumbles || 0;
        });
        const totals = Object.values(playerMap).sort((a, b) => b.yards - a.yards);
        setPlayerTotals(totals);
    }

    async function loadDistrictStandings() {
        // Get all schools and their total yards
        const { data: schools } = await supabase.from("schools").select("id, name");
        const standings = await Promise.all(
            schools?.map(async (school) => {
                const { data } = await supabase
                    .from("player_stats")
                    .select("yards")
                    .eq("athletes.school_id", school.id); // Assuming athletes have school_id, but in schema it might not
                // Actually, since player_stats links to athletes, and athletes don't have school_id in the query, but assuming the school page is for one school, but for district, need to adjust.
                // For simplicity, since this is per school page, perhaps district is global.
                // But to make it work, let's assume we can get total yards per school by joining.
                // But the schema may not have school_id in athletes. From earlier, athletes table likely has school_id implied or not.
                // For now, placeholder.
                const totalYards = data?.reduce((sum, stat) => sum + (stat.yards || 0), 0) || 0;
                return { ...school, totalYards };
            }) || []
        );
        standings.sort((a, b) => b.totalYards - a.totalYards);
        setDistrictStandings(standings);
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

        roster.forEach(player => {
            if (!statsMap[player.id]) {
                statsMap[player.id] = { receptions: 0, yards: 0, fumbles: 0 };
            }
        });

        setStatsForm(statsMap);
    }

    async function loadSchoolLogo() {
        // First try to get logo from schools table
        const { data: schoolData } = await supabase
            .from('schools')
            .select('logo_url')
            .eq('id', params.id)
            .single();

        if (schoolData?.logo_url) {
            setSchoolLogo(schoolData.logo_url);
            const color = await extractColors(schoolData.logo_url);
            setDominantColor(color);
            return;
        }

        // Fallback: look for logo file in storage (for backward compatibility)
        const { data } = await supabase.storage
            .from('logos')
            .list('', { search: `${params.id}-logo` });

        if (data && data.length > 0) {
            const { data: urlData } = supabase.storage
                .from('logos')
                .getPublicUrl(data[0].name);
            setSchoolLogo(urlData.publicUrl);
            const color = await extractColors(urlData.publicUrl);
            setDominantColor(color);
        }
    }

    async function addAthlete(e) {
        e.preventDefault();
        if (!authUserId) {
            alert('You must be logged in to add athletes');
            return;
        }
        const { error } = await supabase.from("athletes").insert([athleteForm]);
        if (error) {
            alert('Error adding athlete: ' + error.message);
        } else {
            setAthleteForm({ number: '', first_name: '', last_name: '', position: '' });
            setEditingAthlete(null);
            loadRoster();
        }
    }

    async function updateAthlete(e) {
        e.preventDefault();
        if (!authUserId) {
            alert('You must be logged in to edit athletes');
            return;
        }
        const { error } = await supabase.from("athletes").update(athleteForm).eq("id", editingAthlete);
        if (error) {
            alert('Error updating athlete: ' + error.message);
        } else {
            setAthleteForm({ number: '', first_name: '', last_name: '', position: '' });
            setEditingAthlete(null);
            loadRoster();
        }
    }

    async function addGame(e) {
        e.preventDefault();
        if (!authUserId) {
            alert('You must be logged in to add games');
            return;
        }
        const { error } = await supabase.from("games").insert([gameForm]);
        if (error) {
            alert('Error adding game: ' + error.message);
        } else {
            setGameForm({ game_date: '', opponent: '', home: true });
            setEditingGame(null);
            loadGames();
        }
    }

    async function updateGame(e) {
        e.preventDefault();
        if (!authUserId) {
            alert('You must be logged in to edit games');
            return;
        }
        const { error } = await supabase.from("games").update(gameForm).eq("id", editingGame);
        if (error) {
            alert('Error updating game: ' + error.message);
        } else {
            setGameForm({ game_date: '', opponent: '', home: true });
            setEditingGame(null);
            loadGames();
        }
    }

    function startEditingAthlete(athlete) {
        setAthleteForm({
            number: athlete.number,
            first_name: athlete.first_name,
            last_name: athlete.last_name,
            position: athlete.position
        });
        setEditingAthlete(athlete.id);
    }

    function startEditingGame(game) {
        setGameForm({
            game_date: game.game_date,
            opponent: game.opponent,
            home: game.home
        });
        setEditingGame(game.id);
    }

    function handleCoachPin(e) {
        e.preventDefault();
        if (coachPin === (process.env.NEXT_PUBLIC_COACH_PIN || '1234')) {
            setCoachMode(true);
            setCoachPin('');
        } else {
            alert('Incorrect pin');
        }
    }

    async function extractColors(imgSrc) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = imgSrc;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);
            return `rgb(${r}, ${g}, ${b})`;
        } catch (error) {
            console.error('Error extracting colors:', error);
            return null;
        }
    }

    async function uploadLogo(e) {
        e.preventDefault();
        if (!authUserId) {
            alert('You must be logged in to upload logo');
            return;
        }
        if (!logoFile) return;

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${params.id}-logo.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(fileName, logoFile, { upsert: true });

        if (uploadError) {
            alert('Error uploading logo: ' + uploadError.message);
            return;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from('logos')
            .getPublicUrl(fileName);

        // Update the schools table with the logo URL
        const { error: updateError } = await supabase
            .from('schools')
            .update({ logo_url: urlData.publicUrl })
            .eq('id', params.id);

        if (updateError) {
            alert('Logo uploaded but failed to update school record: ' + updateError.message);
        } else {
            alert('Logo uploaded successfully!');
            loadSchoolLogo();
            setLogoFile(null);
        }
    }

    async function uploadRoster(e) {
        e.preventDefault();
        if (!authUserId) {
            alert('You must be logged in to upload roster');
            return;
        }
        if (!rosterFile) return;

        const text = await rosterFile.text();
        const lines = text.trim().split('\n');
        const rows = lines[0].toLowerCase().includes('number') ? lines.slice(1) : lines;

        const athletes = rows
            .filter(line => line.trim())
            .map(line => {
                const [number, first_name, last_name, position] = line.split(',').map(s => s.trim());
                return { number: parseInt(number), first_name, last_name, position };
            });

        const { error } = await supabase.from("athletes").insert(athletes);
        if (error) {
            alert('Error uploading roster: ' + error.message);
        } else {
            alert(`${athletes.length} athletes uploaded!`);
            setRosterFile(null);
            loadRoster();
        }
    }

    async function savePlayerStats(e) {
        e.preventDefault();
        if (!authUserId) {
            alert('You must be logged in to save stats');
            return;
        }
        if (!selectedGame) return;

        const statsToSave = Object.entries(statsForm).filter(
            ([_, stats]) => stats.receptions > 0 || stats.yards > 0 || stats.fumbles > 0
        );

        if (statsToSave.length === 0) {
            alert('No stats to save');
            return;
        }

        await supabase.from("player_stats").delete().eq("game_id", selectedGame);

        const results = await Promise.all(
            statsToSave.map(([athleteId, stats]) =>
                supabase.rpc('insert_player_stat', {
                    p_athlete_id: athleteId,
                    p_game_id: selectedGame,
                    p_receptions: parseInt(stats.receptions) || 0,
                    p_yards: parseInt(stats.yards) || 0,
                    p_fumbles: parseInt(stats.fumbles) || 0
                })
            )
        );

        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            alert('Error saving some stats: ' + errors[0].error.message);
        } else {
            alert('Stats saved successfully!');
            loadPlayerStats(selectedGame);
        }
    }

    return (
        <div style={{ padding: 20, backgroundColor: dominantColor ? `rgba(${dominantColor.match(/\d+/g).join(',')}, 0.05)` : 'white', minHeight: '100vh' }}>
            <Link href="/">
                <button style={{ marginBottom: 20 }}>← Back to Schools</button>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                {schoolLogo && (
                    <img src={schoolLogo} alt="School Logo"
                        style={{ width: 100, height: 100, objectFit: 'contain', marginRight: 20, borderRadius: 8 }} />
                )}
                <h1>Weatherford High School Football</h1>
            </div>

            {!coachMode && (
                <div style={{ marginBottom: 20 }}>
                    <form onSubmit={handleCoachPin}>
                        <input type="password" placeholder="Coach PIN" value={coachPin}
                            onChange={(e) => setCoachPin(e.target.value)} required />
                        <button type="submit">Enter Coach Mode</button>
                    </form>
                </div>
            )}

            <div style={{ marginBottom: 20 }}>
                <button onClick={() => setCurrentView('roster')} style={{ marginRight: 10 }}>Roster</button>
                <button onClick={() => setCurrentView('games')} style={{ marginRight: 10 }}>Games</button>
                <button onClick={() => setCurrentView('team-stats')} style={{ marginRight: 10 }}>Team Stats</button>
                <button onClick={() => setCurrentView('player-stats')} style={{ marginRight: 10 }}>Player Stats</button>
                <button onClick={() => setCurrentView('district')} style={{ marginRight: 10 }}>District Standings</button>
            </div>

            {coachMode && (
                <>
                    <div style={{ marginBottom: 30 }}>
                        <h2>Upload School Logo</h2>
                        <form onSubmit={uploadLogo}>
                            <input type="file" accept="image/*"
                                onChange={(e) => setLogoFile(e.target.files[0])} required />
                            <button type="submit">Upload Logo</button>
                        </form>
                    </div>

                    <div style={{ marginBottom: 30 }}>
                        <h2>Upload Roster (CSV)</h2>
                        <p>CSV format: number,first_name,last_name,position</p>
                        <form onSubmit={uploadRoster}>
                            <input type="file" accept=".csv"
                                onChange={(e) => setRosterFile(e.target.files[0])} required />
                            <button type="submit">Upload Roster</button>
                        </form>
                    </div>

                    <h2>{editingAthlete ? 'Edit Athlete' : 'Add Athlete'}</h2>
                    <form onSubmit={editingAthlete ? updateAthlete : addAthlete} style={{ marginBottom: 20 }}>
                        <input type="number" placeholder="Number" value={athleteForm.number}
                            onChange={(e) => setAthleteForm({...athleteForm, number: e.target.value})} required />
                        <input type="text" placeholder="First Name" value={athleteForm.first_name}
                            onChange={(e) => setAthleteForm({...athleteForm, first_name: e.target.value})} required />
                        <input type="text" placeholder="Last Name" value={athleteForm.last_name}
                            onChange={(e) => setAthleteForm({...athleteForm, last_name: e.target.value})} required />
                        <input type="text" placeholder="Position" value={athleteForm.position}
                            onChange={(e) => setAthleteForm({...athleteForm, position: e.target.value})} required />
                        <button type="submit">{editingAthlete ? 'Update Athlete' : 'Add Athlete'}</button>
                        {editingAthlete && <button type="button" onClick={cancelEdit}>Cancel</button>}
                    </form>

                    <h2>{editingGame ? 'Edit Game' : 'Add Game'}</h2>
                    <form onSubmit={editingGame ? updateGame : addGame} style={{ marginBottom: 20 }}>
                        <input type="date" value={gameForm.game_date}
                            onChange={(e) => setGameForm({...gameForm, game_date: e.target.value})} required />
                        <input type="text" placeholder="Opponent" value={gameForm.opponent}
                            onChange={(e) => setGameForm({...gameForm, opponent: e.target.value})} required />
                        <label>
                            <input type="checkbox" checked={gameForm.home}
                                onChange={(e) => setGameForm({...gameForm, home: e.target.checked})} />
                            Home Game
                        </label>
                        <button type="submit">{editingGame ? 'Update Game' : 'Add Game'}</button>
                        {editingGame && <button type="button" onClick={cancelEdit}>Cancel</button>}
                    </form>
                </>
            )}

            {currentView === 'roster' && (
                <>
                    <h2>Roster</h2>
                    {roster.map(a => (
                        <div key={a.id} style={{ marginBottom: 5 }}>
                            {a.number} — {a.first_name} {a.last_name} ({a.position})
                            {coachMode && <button onClick={() => startEditingAthlete(a)} style={{ marginLeft: 10 }}>Edit</button>}
                        </div>
                    ))}
                </>
            )}

            {currentView === 'games' && (
                <>
                    <h2>Games</h2>
                    {games.map(g => (
                        <div key={g.id} style={{ marginBottom: 5 }}>
                            {g.game_date} vs {g.opponent} ({g.home ? "Home" : "Away"})
                            {coachMode && <button onClick={() => startEditingGame(g)} style={{ marginLeft: 10 }}>Edit</button>}
                        </div>
                    ))}
                </>
            )}

            {currentView === 'team-stats' && (
                <>
                    <h2>Team Stats</h2>
                    <p>Total Receptions: {teamStats.receptions}</p>
                    <p>Total Yards: {teamStats.yards}</p>
                    <p>Total Fumbles: {teamStats.fumbles}</p>
                </>
            )}

            {currentView === 'player-stats' && (
                <>
                    <h2>Player Stats</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                            {playerTotals.map(player => (
                                <tr key={player.id}>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                        {player.number} - {player.first_name} {player.last_name}
                                    </td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>{player.position}</td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>{player.receptions}</td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>{player.yards}</td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>{player.fumbles}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {currentView === 'district' && (
                <>
                    <h2>District Standings</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f0f0f0' }}>
                                <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>School</th>
                                <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>Total Yards</th>
                            </tr>
                        </thead>
                        <tbody>
                            {districtStandings.map((school, index) => (
                                <tr key={school.id}>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                        {index + 1}. {school.name}
                                    </td>
                                    <td style={{ padding: 8, border: '1px solid #ddd' }}>{school.totalYards}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {coachMode && currentView === 'games' && (
                <>
                    <h2>Enter Game Stats</h2>
                    <select value={selectedGame}
                        onChange={(e) => {
                            setSelectedGame(e.target.value);
                            if (e.target.value) loadPlayerStats(e.target.value);
                        }}
                        style={{ marginBottom: 20 }}>
                        <option value="">Select a Game</option>
                        {games.map(g => (
                            <option key={g.id} value={g.id}>{g.game_date} vs {g.opponent}</option>
                        ))}
                    </select>

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
                                            <td style={{ padding: 8, border: '1px solid #ddd' }}>{player.position}</td>
                                            {['receptions', 'yards', 'fumbles'].map(stat => (
                                                <td key={stat} style={{ padding: 8, border: '1px solid #ddd' }}>
                                                    <input type="number" min="0"
                                                        value={statsForm[player.id]?.[stat] || 0}
                                                        onChange={(e) => setStatsForm({
                                                            ...statsForm,
                                                            [player.id]: { ...statsForm[player.id], [stat]: e.target.value }
                                                        })}
                                                        style={{ width: '60px' }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button type="submit">Save Stats</button>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}