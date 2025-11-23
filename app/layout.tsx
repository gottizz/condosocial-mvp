import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// OJO AQUÍ: Importamos SIN llaves porque es 'export default'
import ThemeProvider from "./ThemeContext"; 

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