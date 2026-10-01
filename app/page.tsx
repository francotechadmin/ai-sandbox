import Link from "next/link";
import { DEMOS } from "./demos";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">AI Sandbox</h1>
        <p className="mt-2 text-sm text-muted">
          A set of standalone demos showing what an applied AI build can look like.
        </p>
      </header>
      <ul className="flex flex-col gap-3.5">
        {DEMOS.map((demo) => (
          <li key={demo.slug}>
            <Link
              href={`/${demo.slug}`}
              className="block rounded-xl border border-line bg-panel px-5 py-[18px] text-text transition-colors hover:border-[#3a4451]"
            >
              <h2 className="mb-1.5 text-base font-semibold">{demo.name}</h2>
              <p className="mb-2.5 text-sm leading-relaxed text-[#c6cbd3]">{demo.description}</p>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  demo.status === "live" ? "bg-[#1c2c24] text-green" : "bg-[#2c2617] text-amber"
                }`}
              >
                {demo.status === "live" ? "Live" : "In progress"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
