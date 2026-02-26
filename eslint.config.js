import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import html from "eslint-plugin-html";

export default [
	{
		ignores: ["dist", "node_modules", "docs"]
	},
	js.configs.recommended,
	{
		files: ["**/*.{js,jsx}"],
		languageOptions: {
			ecmaVersion: "latest",
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				}
			},
			sourceType: "module"
		},
		plugins: {
			html,
			react,
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh
		},
		rules: {
			// 继承 React JSX Runtime 配置
			...react.configs.recommended.rules,
			...react.configs["jsx-runtime"].rules,

			"eol-last": ["error", "never"],
			// 基础规则
			indent: ["error", "tab"],

			// 空行规则
			"no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 0, "maxBOF": 0 }],
			// React 规则
			"jsx-quotes": ["error", "prefer-double"],

			"no-console": ["off"],

			"no-extra-semi": ["error"],

			"no-tabs": ["off"],

			"no-var": ["error"],

			"object-curly-spacing": ["error", "always"],

			quotes: ["error", "double"],

			"react/prop-types": "off",

			semi: ["error", "always"],
			"space-before-function-paren": ["error", "never"],

			// React Hooks 规则
			...reactHooks.configs.recommended.rules,

			// React Refresh 规则
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true }
			]
		},
		settings: {
			react: {
				version: "detect"
			}
		}
	}
];