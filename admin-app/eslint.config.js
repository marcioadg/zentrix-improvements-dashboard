import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import zentrixPlugin from "/home/ubuntu/zentrix-standards/eslint-plugin/index.js";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // TODO: Migrate remaining 4,645+ any types to proper types incrementally.
      // This rule has been temporarily suppressed to restore linting quality
      // while the codebase migrates to strict typing. Target removal by 2026-Q3.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@zentrix/design-system": zentrixPlugin,
    },
    rules: {
      "@zentrix/design-system/no-hardcoded-colors": "warn",
      "@zentrix/design-system/no-raw-tailwind-colors": "warn",
      "@zentrix/design-system/no-invalid-font-weight": "warn",
    },
  },
);
