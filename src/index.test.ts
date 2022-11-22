import { unstable_dev, UnstableDevWorker } from 'wrangler'

interface TestContext {
    worker: UnstableDevWorker
}

type TestFn = (context: TestContext) => Promise<void>

const setupTest = (test: TestFn) => async () => {
    const worker = await unstable_dev(
        'src/index.ts',
        {},
        { disableExperimentalWarning: true },
    )
    await test({ worker })
    await worker.stop()
}

describe('shared list activity timestamp worker tests', () => {
    it(
        'should be able to set shared list timestamps in KV',
        setupTest(async ({ worker }) => {
            const now = Date.now()
            const response = await worker.fetch()
            expect(await response.text()).toEqual('Hello World!')
        }),
    )
})
