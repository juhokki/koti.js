import js from "@eslint/js";
import globals from "globals";

export default [
	js.configs.recommended,
	{
        "languageOptions": {
            "ecmaVersion": "latest",
            "sourceType": "module",
            "globals": {
                ...globals.node
            }
        },
		"rules": {
			"indent": [
				"error",
				"tab",
				{ "SwitchCase": 1 }
			],
			"linebreak-style": [
				"error",
				"windows"
			],
			"quotes": [
				"error",
				"double"
			],
			"semi": [
				"error",
				"always"
			],
			"no-unused-vars": ["error", { 
				"args": "none",
				"caughtErrors": "none"
			}],
			"quote-props": ["error", "always"]
		}
	}
];
