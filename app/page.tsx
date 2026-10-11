import { Header, Footer } from "@/components/chrome";
import { WritingWorkspace } from "@/components/writing-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "ZimanKit",
    description: "Spelling, word analysis, and document tools for Sorani and Kurmanji.",
    type: "website",
    url: "/",
  },
};
export default function Home() {
  return (
    <div className="site-frame">
      <Header />
      <main id="main">
        <section className="hero writing-hero">
          <h1>
            A workspace for
            <br />
            <span>Kurdish writing.</span>
          </h1>
          <p>
            Spelling, word exploration, and document tools for Sorani and Kurmanji.
            <br className="desktop-break" /> Free to use. Your text stays on your device.
          </p>
        </section>
        <WritingWorkspace />
      </main>
      <Footer />
    </div>
  );
}
