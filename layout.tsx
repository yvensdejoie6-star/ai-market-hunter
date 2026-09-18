import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title:"AI Market Hunter V1", description:"Short-term paper trading scanner" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }