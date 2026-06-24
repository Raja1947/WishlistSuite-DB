import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WishlistSuite DB",
  description: "WishlistSuite Database Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ background: "#0f0f0f", color: "white" }}>
        {children}
      </body>
    </html>
  );
}
