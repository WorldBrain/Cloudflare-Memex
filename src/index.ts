/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import {
    SHARED_LIST_TIMESTAMP_GET_ROUTE,
    SHARED_LIST_TIMESTAMP_SET_ROUTE,
} from '../external/@worldbrain/memex-common/ts/page-activity-indicator/backend/constants'
import type {
    SharedListTimestampSetRequest,
    SharedListTimestampGetRequest,
    SharedListTimestamp,
} from '../external/@worldbrain/memex-common/ts/page-activity-indicator/backend/types'

export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket;

    SECRET_CREDENTIALS: string
    ENVIRONMENT: 'production' | 'staging' | 'dev'
    SHARED_LIST_ACTIVITY_TIMESTAMPS: KVNamespace
}

async function handleSettingTimestamps(
    { headers }: Request,
    env: Env,
    { sharedListTimestamps }: SharedListTimestampSetRequest,
): Promise<Response> {
    const authHeader = headers.get('Authorization')

    if (
        authHeader == null ||
        authHeader.match(/^Basic (.+)$/)?.[1] !== env.SECRET_CREDENTIALS
    ) {
        return new Response(
            'Required auth credentials not received in request.',
            { status: 401 },
        )
    }

    if (!sharedListTimestamps?.length) {
        return new Response(
            'Expected shared list timestamp tuples were not supplied.',
            { status: 400 },
        )
    }

    for (const tuple of sharedListTimestamps) {
        if (
            !Array.isArray(tuple) ||
            tuple.length !== 2 ||
            typeof tuple[0] !== 'string' ||
            typeof tuple[1] !== 'number'
        ) {
            return new Response(
                'Incorrectly typed shared list timestamp tuples were supplied.',
                { status: 400 },
            )
        }
    }

    for (const [sharedList, timestamp] of sharedListTimestamps) {
        await env.SHARED_LIST_ACTIVITY_TIMESTAMPS.put(
            sharedList,
            timestamp.toString(),
        )
    }

    return new Response()
}

async function handleGettingTimestamps(
    request: Request,
    env: Env,
    { sharedListIds }: SharedListTimestampGetRequest,
): Promise<Response> {
    if (!sharedListIds?.length || !Array.isArray(sharedListIds)) {
        return new Response('Expected shared list IDs were not supplied.', {
            status: 400,
        })
    }

    for (const sharedListId of sharedListIds) {
        if (typeof sharedListId !== 'string' || !sharedListId.length) {
            return new Response(
                'Incorrectly typed shared list IDs were supplied.',
                { status: 400 },
            )
        }
    }

    const sharedListTimestamps: SharedListTimestamp[] = []

    for (const sharedListId of sharedListIds) {
        const timestampString = await env.SHARED_LIST_ACTIVITY_TIMESTAMPS.get(
            sharedListId,
        )
        if (timestampString == null) {
            continue
        }
        const timestampNumber = parseInt(timestampString)
        sharedListTimestamps.push([sharedListId, timestampNumber])
    }

    return new Response(JSON.stringify(sharedListTimestamps))
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext,
    ): Promise<Response> {
        let response: Response
        try {
            const { pathname } = new URL(request.url)
            if (
                pathname === SHARED_LIST_TIMESTAMP_SET_ROUTE &&
                request.method === 'POST'
            ) {
                const data = await request.json<SharedListTimestampSetRequest>()
                response = await handleSettingTimestamps(request, env, data)
            } else if (
                pathname === SHARED_LIST_TIMESTAMP_GET_ROUTE &&
                request.method === 'POST'
            ) {
                const data = await request.json<SharedListTimestampGetRequest>()
                response = await handleGettingTimestamps(request, env, data)
            } else {
                response = new Response(
                    'Request was made to a location unknown to the worker',
                    { status: 410 },
                )
            }
        } catch (err) {
            let message = ''
            if (err instanceof Error) {
                message = err.message
            }
            response = new Response(
                `Worker encountered an unknown error during processing:\n${message}`,
                { status: 500 },
            )
        } finally {
            return response!
        }
    },
}
