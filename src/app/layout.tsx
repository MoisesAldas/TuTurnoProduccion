import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from '@/hooks/useAuth'
import "@fontsource/poppins/900.css"; // Black weight for Logo component (extra bold)
import StickyCTA from "@/components/StickyCTA";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TuTurno - Gestión de Citas Inteligente",
  description: "Plataforma integral para gestionar citas y hacer crecer tu negocio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen overflow-y-auto`}
      >
        <AuthProvider>
          {children}
          <StickyCTA />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
