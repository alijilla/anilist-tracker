import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'

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

interface FavoriteDocument {
  userId: string
  animeId: number
  title: string
  coverImage: string
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

interface AnimeListProps {
  user: User
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

function AnimeList({ user }: AnimeListProps) {
  const [anime, setAnime] = useState<AniListMedia[]>([])
  const [favoriteDocIds, setFavoriteDocIds] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favoriteActionLoading, setFavoriteActionLoading] = useState<number | null>(null)
  const [favoriteActionError, setFavoriteActionError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!user) {
      return
    }

    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid),
    )

    const unsubscribe = onSnapshot(
      favoritesQuery,
      (snapshot) => {
        const nextFavoriteDocIds = new Map<number, string>()

        snapshot.docs.forEach((document) => {
          const data = document.data() as Partial<FavoriteDocument>

          if (typeof data.animeId === 'number') {
            nextFavoriteDocIds.set(data.animeId, document.id)
          }
        })

        setFavoriteDocIds(nextFavoriteDocIds)
      },
      (snapshotError) => {
        setFavoriteActionError(snapshotError.message)
      },
    )

    return () => unsubscribe()
  }, [user])

  const handleFavoriteToggle = async (entry: AniListMedia) => {
    const favoriteDocId = favoriteDocIds.get(entry.id)

    try {
      setFavoriteActionLoading(entry.id)
      setFavoriteActionError(null)

      if (favoriteDocId) {
        await deleteDoc(doc(db, 'favorites', favoriteDocId))
        return
      }

      const title = entry.title.english || entry.title.romaji || 'Untitled'
      const favorite: FavoriteDocument = {
        userId: user.uid,
        animeId: entry.id,
        title,
        coverImage: entry.coverImage.large ?? '',
      }

      await setDoc(doc(db, 'favorites', `${user.uid}_${entry.id}`), favorite)
    } catch (caughtError) {
      setFavoriteActionError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Something went wrong while updating favorites.',
      )
    } finally {
      setFavoriteActionLoading(null)
    }
  }

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
      {favoriteActionError ? (
        <div className="anime-list__state anime-list__state--error anime-list__state--full-width">
          {favoriteActionError}
        </div>
      ) : null}

      {anime.map((entry) => {
        const title = entry.title.english || entry.title.romaji || 'Untitled'
        const isFavorite = favoriteDocIds.has(entry.id)

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

              <button
                className={isFavorite ? 'favorite-button favorite-button--danger' : 'favorite-button'}
                type="button"
                disabled={favoriteActionLoading === entry.id}
                onClick={() => void handleFavoriteToggle(entry)}
              >
                {favoriteActionLoading === entry.id
                  ? 'Saving...'
                  : isFavorite
                    ? 'Remove from favorites'
                    : 'Save to favorites'}
              </button>
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default AnimeList
