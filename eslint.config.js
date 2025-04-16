const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');
const chaiFriendly = require('eslint-plugin-chai-friendly');

module.exports = [
    {
        ignores: ['dist/**', 'dist/**/.*', 'eslint.config.js']
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": ["error", { "ignoreRestArgs": false }],
            "no-unused-expressions": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "chai-friendly/no-unused-expressions": "error"
        },
        languageOptions: {
            parser: tseslint.parser,
            globals: {
                ...globals.node,
                ...globals.mocha
            }
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            "chai-friendly": chaiFriendly
        }
    }
];