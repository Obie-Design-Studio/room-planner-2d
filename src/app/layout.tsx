import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <--- THIS IS CRITICAL

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <head>
        <style>{`
          /* Reset & Base */
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f9fafb; }
          
          /* Input Styling */
          input[type="text"], input[type="number"] {
            display: block;
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            line-height: 1.25rem;
            color: #1f2937;
            background-color: #fff;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            box-sizing: border-box; /* Important! */
          }
          input[type="text"]:focus, input[type="number"]:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          
          /* Layout */
          aside { background: white; border-right: 1px solid #e5e7eb; box-sizing: border-box; }
          
          /* Typography */
          label { display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.25rem; }
          h1 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
          
          /* Buttons */
          button { cursor: pointer; }
          
          /* Range Slider */
          input[type="range"] { width: 100%; }
        `}</style>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
