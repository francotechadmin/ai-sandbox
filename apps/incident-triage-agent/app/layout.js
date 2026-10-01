import "./globals.css";

export const metadata = {
  title: "Industrial Incident Triage Agent — CTO Demo",
  description:
    "A production-readiness demo that turns a messy operations alert into an evidence-backed recommendation, routes consequential actions to a human, and leaves a complete audit trail.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
