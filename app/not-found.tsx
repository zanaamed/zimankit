import { Header, Footer } from "@/components/chrome";
export default function NotFound() {
  return (
    <div className="site-frame">
      <Header />
      <main id="main" className="not-found">
        <h1>This page isn’t here.</h1>
        <p>Check the address or return to the workspace.</p>
        <a href="/" className="button primary">
          Open workspace
        </a>
      </main>
      <Footer />
    </div>
  );
}
