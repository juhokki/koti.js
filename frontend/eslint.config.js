import globals from "globals";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import prettier from "eslint-config-prettier";

export default tseslint.config(
	{
		settings: { react: { version: "19.0" } },
		plugins: {
			react
		},
		languageOptions: {
			globals: {
				...globals.browser
			},
			parserOptions: {
				project: ["./tsconfig.node.json", "./tsconfig.app.json"],
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	react.configs.flat.recommended,
	prettier,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "none",
					caughtErrors: "none"
				}
			],
			...react.configs.recommended.rules,
			...react.configs["jsx-runtime"].rules
		}
	},
	{
		ignores: [
			"dist/",
			"public/",
			"node_modules/",
			"coverage/",
			"package-lock.json",
			"eslint.config.js",
			".prettierrc.js",
			"vitest.config.ts"
		]
	}
);
