"use client";

import Link from "next/link";

export default function Home() {
    return (
        <div style={{ padding: 20, textAlign: 'center' }}>
            <h1>District Stats</h1>
            <p>Select your school to view and enter statistics</p>

            <div style={{ marginTop: 40 }}>
                <h2>Weatherford ISD</h2>
                <Link href="/school/weatherford-football">
                    <button style={{
                        padding: '10px 20px',
                        fontSize: '18px',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}>
                        Weatherford High School Football
                    </button>
                </Link>
            </div>
        </div>
    );
}
