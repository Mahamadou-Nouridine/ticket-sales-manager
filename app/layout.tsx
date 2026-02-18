import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "@/components/providers";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'Vendora - Gestion des Commandes de Tickets',
    template: '%s | Vendora'
  },
  description: 'Plateforme de gestion des commandes de tickets pour organisations. Gérez vos vendeurs, suivez vos commandes et générez des rapports en temps réel.',
  keywords: ['gestion de commandes', 'tickets', 'vendeurs', 'rapports', 'inventaire'],
  authors: [{ name: 'Vendora' }],
  icons: {
    icon: '/images/logo.svg',
    shortcut: '/images/logo.svg',
    apple: '/images/logo.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://vendora.app',
    title: 'Vendora - Gestion des Commandes de Tickets',
    description: 'Plateforme de gestion des commandes de tickets pour organisations',
    siteName: 'Vendora',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <NextTopLoader />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
