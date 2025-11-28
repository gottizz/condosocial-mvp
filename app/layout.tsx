import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./ThemeContext"; // Importación sin llaves

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CondoSocial MVP",
  description: "Gestión comunitaria transparente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}