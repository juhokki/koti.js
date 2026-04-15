import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.node
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	prettier,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "none",
					caughtErrors: "none"
				}
			]
		}
	},
	{
		ignores: [
			"dist/",
			"node_modules/",
			"coverage/",
			"package-lock.json",
			"eslint.config.js",
			".prettierrc.js"
		]
	}
);
