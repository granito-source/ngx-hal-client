/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
    collectCoverage: true,
    coverageDirectory: 'build/coverage',
    coverageProvider: 'v8',
    coverageReporters: [
        'text',
        'lcov'
    ]
};

module.exports = config;
