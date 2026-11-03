import js from "@eslint/js";
import tseslint from "typescript-eslint";

const node = { Buffer: "readonly", console: "readonly", process: "readonly", setTimeout: "readonly", URL: "readonly" };

export default tseslint.config(
  { ignores: ["dist", "node_modules", "e2e/out"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["scripts/**/*.mjs", "e2e/**/*.mjs"], languageOptions: { globals: node } },
);
