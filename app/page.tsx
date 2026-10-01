import Link from "next/link";
import { DEMOS } from "./demos";

export default function HomePage() {
  return (
    <main className="home">
      <header className="home-header">
        <h1>AI Sandbox</h1>
        <p>A set of standalone demos showing what an applied AI build can look like.</p>
      </header>
      <ul className="demo-list">
        {DEMOS.map((demo) => (
          <li key={demo.slug} className="demo-card">
            <Link href={`/${demo.slug}`}>
              <h2>{demo.name}</h2>
              <p>{demo.description}</p>
              <span className={`status status-${demo.status}`}>
                {demo.status === "live" ? "Live" : "In progress"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
