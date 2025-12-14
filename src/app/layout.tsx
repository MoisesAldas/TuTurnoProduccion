import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from "@/components/theme-provider"
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TuTurno",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-72x72web.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-72x72web.png",
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  themeColor: "#ea580c",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen overflow-y-auto`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            {children}
            <StickyCTA />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
