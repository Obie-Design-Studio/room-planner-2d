import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css"; // <--- THIS IS CRITICAL

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Room Planner 2D",
  description: "Drag and drop room planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body className={dmSans.className}>{children}</body>
    </html>
  );
}
