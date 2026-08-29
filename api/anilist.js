import { createHash } from 'node:crypto'

const CACHE_TTL_SECONDS = 600
const ANILIST_ENDPOINT = process.env.ANILIST_ENDPOINT || 'https://graphql.anilist.co'
const memoryCache = new Map()

export const config = {
  runtime: 'nodejs',
}

function getCacheKey(query, variables = {}) {
  return `anilist:${createHash('sha256')
    .update(`${query}\n${JSON.stringify(variables)}`)
    .digest('hex')}`
}

function getMemoryCachedResponse(cacheKey) {
  const cached = memoryCache.get(cacheKey)

  if (!cached) {
    return null
  }

  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(cacheKey)
    return null
  }

  return cached.value
}

function setMemoryCachedResponse(cacheKey, value) {
  memoryCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    value,
  })
}

async function getCachedResponse(cacheKey) {
  return getMemoryCachedResponse(cacheKey)
}

async function setCachedResponse(cacheKey, value) {
  setMemoryCachedResponse(cacheKey, value)
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  const chunks = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')

  if (!rawBody) {
    return {}
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new Error('Invalid JSON body received by the API route.')
  }
}

function getRetryDelaySeconds(retryAfterHeader) {
  const numericValue = Number(retryAfterHeader)

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return Math.max(1, Math.ceil(numericValue))
  }

  return 1
}

async function forwardToAniList(query, variables = {}) {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (response.status === 429) {
    const retryAfter = getRetryDelaySeconds(response.headers.get('retry-after'))

    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000 + 250))

    const retryResponse = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    if (retryResponse.ok) {
      return retryResponse
    }

    return new Response(
      JSON.stringify({
        error: 'AniList rate limited. Please try again shortly.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      },
    )
  }

  return response
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    const body = await readJsonBody(req)
    const { query, variables = {} } = body ?? {}

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'A GraphQL query string is required.',
      })
    }

    const cacheKey = getCacheKey(query, variables)
    const cachedResult = await getCachedResponse(cacheKey)

    if (cachedResult) {
      return res.status(200).json(cachedResult)
    }

    const aniListResponse = await forwardToAniList(query, variables)

    if (!aniListResponse.ok) {
      const bodyText = await aniListResponse.text()
      let payload

      try {
        payload = JSON.parse(bodyText)
      } catch {
        payload = { error: bodyText || 'AniList request failed.' }
      }

      const retryAfter = getRetryDelaySeconds(aniListResponse.headers.get('retry-after'))

      return res.status(aniListResponse.status).json({
        ...payload,
        retryAfter,
      })
    }

    const json = await aniListResponse.json()
    await setCachedResponse(cacheKey, json)

    return res.status(200).json(json)
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    })
  }
}
