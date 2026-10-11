import { ArrowUpRight, CodeXml } from "lucide-react";
export const REPO_URL = "https://github.com/zanaamed/zimankit";
export function Header({
  active = "workspace",
}: {
  active?: "workspace" | "playground" | "docs" | "credits";
}) {
  return (
    <header className="topbar">
      <a href="/" className="brand" aria-label="ZimanKit home">
        <CodeXml aria-hidden="true" />
        <span>ZimanKit</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/" aria-current={active === "workspace" ? "page" : undefined}>
          Workspace
        </a>
        <a href="/tools/" aria-current={active === "playground" ? "page" : undefined}>
          Text tools
        </a>
        <a href="/docs/" aria-current={active === "docs" ? "page" : undefined}>
          Documentation
        </a>
      </nav>
      <a className="button github-button" href={REPO_URL} target="_blank" rel="noreferrer">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .8a11.3 11.3 0 0 0-3.57 22.02c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.02 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.53-2.5-.29-5.14-1.25-5.14-5.57 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.16a10.8 10.8 0 0 1 5.65 0c2.15-1.46 3.1-1.16 3.1-1.16.61 1.55.23 2.7.11 2.98.72.79 1.16 1.8 1.16 3.03 0 4.34-2.64 5.28-5.16 5.56.41.35.77 1.04.77 2.1v3.2c0 .3.2.65.78.54A11.3 11.3 0 0 0 12 .8Z" />
        </svg>
        <span>GitHub</span>
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <p>Text tools for Sorani and Kurmanji.</p>
      <div>
        <a href="/credits/">Licenses & credits</a>
        <span aria-hidden="true">·</span>
        <a href="/docs/#library">Library</a>
        <span aria-hidden="true">·</span>
        <a href="/docs/#api">API</a>
        <span className="version">Workspace v0.2</span>
      </div>
    </footer>
  );
}
