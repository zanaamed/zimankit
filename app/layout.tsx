import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://zimankit.sorinlab.com"),
  title: { default: "ZimanKit — Kurdish writing tools", template: "%s — ZimanKit" },
  description:
    "A free Kurdish writing workspace for Sorani and Kurmanji. Review spelling, explore words, clean documents, and export your work. Processing stays on your device.",
  applicationName: "ZimanKit",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "ZimanKit",
    description: "Spelling, word analysis, and document tools for Sorani and Kurmanji.",
    type: "website",
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
