module.exports = {
    preset: 'ts-jest/presets/default-esm',
    transform: {
        '\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
                useESM: true,
            },
        ],
    },
    rootDir: '.',
    moduleNameMapper: {
        // TODO: get these submodule paths working...
        //     '^@worldbrain/memex-common$':
        //         '<rootdir>/external/@worldbrain/memex-common/ts',
        //     '^@worldbrain/memex-common/lib/(.*)':
        //         '<rootdir>/external/@worldbrain/memex-common/ts/$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    // testEnvironment: 'miniflare',
    // testEnvironmentOptions: {
    //     // Miniflare doesn't yet support the `main` field in `wrangler.toml` so we
    //     // need to explicitly tell it where our built worker is. We also need to
    //     // explicitly mark it as an ES module.
    //     scriptPath: 'dist/index.mjs',
    //     modules: true,
    // },
}
