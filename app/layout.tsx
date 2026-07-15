import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Patua_One } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Patua_One({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = `${origin}/og.png`;

  return {
    metadataBase: new URL(origin),
    title: "FxHey! — Firefox Accounts release intelligence",
    description:
      "Live Firefox Accounts deployment status with the issues, pull requests, and commits riding each release train.",
    openGraph: {
      title: "FxHey! — What’s riding the Firefox Accounts train?",
      description: "Live production status and complete FxA train contents.",
      type: "website",
      images: [{ url: socialImage, width: 1728, height: 927, alt: "FxHey Train 340 release intelligence" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "FxHey! — Firefox Accounts release intelligence",
      description: "See the issues, pull requests, and commits in every FxA train.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
