import { unstable_dev, UnstableDevWorker } from 'wrangler'
import {
    SHARED_LIST_TIMESTAMP_GET_ROUTE,
    SHARED_LIST_TIMESTAMP_SET_ROUTE,
} from '../external/@worldbrain/memex-common/ts/page-activity-indicator/backend/constants'
import type { SharedListTimestamp } from '../external/@worldbrain/memex-common/ts/page-activity-indicator/backend/types'

interface TestContext {
    worker: UnstableDevWorker
}

type TestRunner = (context: TestContext) => Promise<void>

const testAuthCredentials = 'dGVzdDp0ZXN0='

const setupTest = (test: TestRunner) => async () => {
    const worker = await unstable_dev(
        'src/index.ts',
        { env: 'dev' },
        { disableExperimentalWarning: true },
    )
    await test({ worker })
    await worker.stop()
}

async function testSetRoute(
    worker: UnstableDevWorker,
    sharedListTimestamps: any,
    authCredentials: string | null,
    expectedResponse: {
        ok: boolean
        text?: string
        status: number
    },
) {
    const response = await worker.fetch(SHARED_LIST_TIMESTAMP_SET_ROUTE, {
        method: 'POST',
        headers:
            authCredentials != null
                ? { Authorization: `Basic ${authCredentials}` }
                : undefined,
        body: JSON.stringify({ sharedListTimestamps }),
    })
    expect(response.ok).toBe(expectedResponse.ok)
    expect(response.status).toBe(expectedResponse.status)
    if (expectedResponse.text != null) {
        expect(await response.text()).toEqual(expectedResponse.text)
    }
}

async function testGetRoute(
    worker: UnstableDevWorker,
    sharedListIds: any,
    expectedResponse: {
        ok: boolean
        text?: string
        status: number
        sharedListTimestamps?: SharedListTimestamp[]
    },
) {
    const response = await worker.fetch(SHARED_LIST_TIMESTAMP_GET_ROUTE, {
        method: 'POST',
        body: JSON.stringify({ sharedListIds }),
    })
    expect(response.ok).toBe(expectedResponse.ok)
    expect(response.status).toBe(expectedResponse.status)
    if (expectedResponse.text != null) {
        expect(await response.text()).toEqual(expectedResponse.text)
    }
    if (expectedResponse.sharedListTimestamps != null) {
        expect(await response.json()).toEqual(
            expectedResponse.sharedListTimestamps,
        )
    }
}

describe('shared list activity timestamp worker tests', () => {
    it(
        'should be able to get and set shared list timestamps',
        setupTest(async ({ worker }) => {
            const now = Date.now()
            const sharedListTimestamps = new Map([
                ['test-a', now],
                ['test-b', now + 1],
                ['test-c', now + 2],
                ['test-d', now + 2],
            ])

            await testGetRoute(worker, [...sharedListTimestamps.keys()], {
                ok: true,
                status: 200,
                sharedListTimestamps: [],
            })

            await testSetRoute(
                worker,
                [...sharedListTimestamps.entries()],
                testAuthCredentials,
                {
                    ok: true,
                    status: 200,
                },
            )

            // TODO: Find a way to directly assert KV contents
            await testGetRoute(worker, [...sharedListTimestamps.keys()], {
                ok: true,
                status: 200,
                sharedListTimestamps: [...sharedListTimestamps.entries()],
            })

            sharedListTimestamps.set('test-b', now + 10)
            sharedListTimestamps.set('test-d', now + 100)
            await testSetRoute(
                worker,
                [...sharedListTimestamps.entries()],
                testAuthCredentials,
                {
                    ok: true,
                    status: 200,
                },
            )

            await testGetRoute(worker, [...sharedListTimestamps.keys()], {
                ok: true,
                status: 200,
                sharedListTimestamps: [...sharedListTimestamps.entries()],
            })
        }),
    )

    it(
        'should reject non-authed attempts at setting shared list timestamps',
        setupTest(async ({ worker }) => {
            await testSetRoute(worker, [['test-a', 1]], null, {
                ok: false,
                status: 401,
            })
            await testSetRoute(worker, [['test-a', 1]], 'test', {
                ok: false,
                status: 401,
            })
            await testSetRoute(
                worker,
                [['test-a', 1]],
                Buffer.from('test:not-the-password').toString('base64'),
                {
                    ok: false,
                    status: 401,
                },
            )
        }),
    )

    it(
        'should complain on incorrectly typed or missing data when setting shared list timestamps',
        setupTest(async ({ worker }) => {
            await testSetRoute(worker, [], testAuthCredentials, {
                ok: false,
                status: 400,
            })
            await testSetRoute(worker, undefined, testAuthCredentials, {
                ok: false,
                status: 400,
            })
            await testSetRoute(worker, 'test-a', testAuthCredentials, {
                ok: false,
                status: 400,
            })
            await testSetRoute(
                worker,
                [
                    ['test-a', 123],
                    ['test-b', '199'],
                ],
                testAuthCredentials,
                {
                    ok: false,
                    status: 400,
                },
            )
            await testSetRoute(
                worker,
                [['test-a', 123, 'test-b', '199']],
                testAuthCredentials,
                {
                    ok: false,
                    status: 400,
                },
            )
            await testSetRoute(worker, [['test-a']], testAuthCredentials, {
                ok: false,
                status: 400,
            })
            await testSetRoute(worker, [[123, 123]], testAuthCredentials, {
                ok: false,
                status: 400,
            })
        }),
    )

    it(
        'should complain on incorrectly typed or missing data when getting shared list timestamps',
        setupTest(async ({ worker }) => {
            await testGetRoute(worker, [], {
                ok: false,
                status: 400,
            })
            await testGetRoute(worker, undefined, {
                ok: false,
                status: 400,
            })
            await testGetRoute(worker, 'test-a', {
                ok: false,
                status: 400,
            })
            await testGetRoute(
                worker,
                [
                    ['test-a', 123],
                    ['test-b', 199],
                ],
                {
                    ok: false,
                    status: 400,
                },
            )
            await testGetRoute(worker, [['test-a', 123, 'test-b', '199']], {
                ok: false,
                status: 400,
            })
            await testGetRoute(worker, [['test-a']], {
                ok: false,
                status: 400,
            })
        }),
    )
})
