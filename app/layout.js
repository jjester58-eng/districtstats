export const metadata = {
    title: "Weatherford Stats",
    description: "Weatherford Football Stats App"
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
