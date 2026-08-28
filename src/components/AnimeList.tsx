import { useEffect, useState } from 'react'

interface AniListTitle {
  romaji: string
  english?: string | null
}

interface AniListCoverImage {
  large?: string | null
}

interface AniListMedia {
  id: number
  title: AniListTitle
  coverImage: AniListCoverImage
  description?: string | null
  averageScore?: number | null
}

interface AniListPage {
  media: AniListMedia[]
}

interface AniListResponseData {
  Page: AniListPage
}

interface AniListError {
  message: string
}

interface AniListResponse {
  data?: AniListResponseData
  errors?: AniListError[]
}

const ANILIST_QUERY = `
  query {
    Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji english }
        coverImage { large }
        description
        averageScore
      }
    }
  }
`

function AnimeList() {
  const [anime, setAnime] = useState<AniListMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchAnime = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ query: ANILIST_QUERY }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = (await response.json()) as AniListResponse

        if (payload.errors?.length) {
          throw new Error(payload.errors[0].message)
        }

        const media = payload.data?.Page?.media ?? []
        setAnime(media)
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name === 'AbortError') {
          return
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Something went wrong while fetching anime data.',
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchAnime()

    return () => controller.abort()
  }, [])

  if (loading) {
    return <div className="anime-list__state">Loading anime...</div>
  }

  if (error) {
    return (
      <div className="anime-list__state anime-list__state--error">
        Error loading anime: {error}
      </div>
    )
  }

  if (anime.length === 0) {
    return <div className="anime-list__state">No anime available right now.</div>
  }

  return (
    <section className="anime-list" aria-live="polite">
      {anime.map((entry) => {
        const title = entry.title.english || entry.title.romaji || 'Untitled'

        return (
          <article className="anime-card" key={entry.id}>
            <img
              className="anime-card__cover"
              src={entry.coverImage.large ?? ''}
              alt={title}
            />

            <div className="anime-card__content">
              <div className="anime-card__header">
                <h2>{title}</h2>
                <span className="anime-card__score">⭐ {entry.averageScore ?? 'N/A'}</span>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default AnimeList
