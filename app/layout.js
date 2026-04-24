import './globals.css';

export const metadata = {
    title: "District Football Stats",
    description: "Track and analyze football performance across your district"
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
