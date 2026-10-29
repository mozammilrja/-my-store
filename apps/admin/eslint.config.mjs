import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores(["dist/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    // Installed shadcn and ReUI primitives, vendored as published and not ours to edit.
    files: ["src/components/ui/**", "src/components/reui/**"],
    rules: {
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-useless-assignment": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
])
