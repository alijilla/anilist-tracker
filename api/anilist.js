import { createHash } from 'node:crypto'

const CACHE_TTL_MS = 10 * 60 * 1000
const ANILIST_ENDPOINT = process.env.ANILIST_ENDPOINT || 'https://graphql.anilist.co'
const cache = new Map()

function getCacheKey(query, variables = {}) {
  return createHash('sha256')
    .update(`${query}\n${JSON.stringify(variables)}`)
    .digest('hex')
}

function getCachedResponse(cacheKey) {
  const cached = cache.get(cacheKey)

  if (!cached) {
    return null
  }

  if (Date.now() > cached.expiresAt) {
    cache.delete(cacheKey)
    return null
  }

  return cached.value
}

function setCachedResponse(cacheKey, value) {
  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  })
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

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    const body = await request.json()
    const { query, variables = {} } = body ?? {}

    if (!query || typeof query !== 'string') {
      return response.status(400).json({
        error: 'A GraphQL query string is required.',
      })
    }

    const cacheKey = getCacheKey(query, variables)
    const cachedResult = getCachedResponse(cacheKey)

    if (cachedResult) {
      return response.status(200).json(cachedResult)
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

      return response.status(aniListResponse.status).json({
        ...payload,
        retryAfter,
      })
    }

    const json = await aniListResponse.json()
    setCachedResponse(cacheKey, json)

    return response.status(200).json(json)
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.',
    })
  }
}
