import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", ".venv/**", "api/**", "next-env.d.ts"],
  },
  // Copied unmodified from assistant-ui's component kit; update by re-copying, not editing.
  { ignores: ["components/**", "hooks/**", "lib/**"] },
];

export default config;
