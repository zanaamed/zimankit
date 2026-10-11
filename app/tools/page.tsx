import { Header, Footer } from "@/components/chrome";
import { Playground } from "@/components/playground";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Text tools",
  alternates: { canonical: "/tools/" },
};
export default function Tools() {
  return (
    <div className="site-frame">
      <Header active="playground" />
      <main id="main">
        <section className="hero">
          <h1>
            Kurdish text tools.
            <br />
            <span>Check each change.</span>
          </h1>
          <p>
            Focused normalization, cleanup, and experimental alphabet conversion. Your text stays in
            your browser.
          </p>
        </section>
        <Playground />
      </main>
      <Footer />
    </div>
  );
}
