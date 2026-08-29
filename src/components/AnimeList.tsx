import { useEffect, useMemo, useState } from 'react'
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
  genres?: string[] | null
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

type TrackerStatus = 'finished' | 'queued' | 'rewatch'

interface TrackedAnimeItem {
  animeId: number
  title: string
  coverImage: string
  status: TrackerStatus
  hoursWatched: number
}

interface AnimeListProps {
  user: User
  searchTerm: string
  trackedAnime: TrackedAnimeItem[]
  onStatusChange: (animeId: number, title: string, coverImage: string, status: TrackerStatus) => void
  onStatusRemove: (animeId: number) => void
}

const ANILIST_QUERY = `
  query {
    Page(page: 1, perPage: 100) {
      media(type: ANIME, sort: [START_DATE_DESC, POPULARITY_DESC]) {
        id
        title { romaji english }
        coverImage { large }
        description
        averageScore
        genres
      }
    }
  }
`

const PAGE_SIZE = 8

function AnimeList({
  user,
  searchTerm,
  trackedAnime,
  onStatusChange,
  onStatusRemove,
}: AnimeListProps) {
  const [anime, setAnime] = useState<AniListMedia[]>([])
  const [favoriteDocIds, setFavoriteDocIds] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favoriteActionLoading, setFavoriteActionLoading] = useState<number | null>(null)
  const [favoriteActionError, setFavoriteActionError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()

    const fetchAnime = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/anilist', {
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
    setPage(1)
  }, [searchTerm])

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

  const filteredAnime = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    if (!normalized) {
      return anime
    }

    return anime.filter((entry) => {
      const title = (entry.title.english || entry.title.romaji || 'Untitled').toLowerCase()
      return title.includes(normalized)
    })
  }, [anime, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredAnime.length / PAGE_SIZE))
  const paginatedAnime = filteredAnime.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  if (filteredAnime.length === 0) {
    return <div className="anime-list__state">No anime match your search right now.</div>
  }

  return (
    <section className="anime-list" aria-live="polite">
      {favoriteActionError ? (
        <div className="anime-list__state anime-list__state--error anime-list__state--full-width">
          {favoriteActionError}
        </div>
      ) : null}

      {paginatedAnime.map((entry) => {
        const title = entry.title.english || entry.title.romaji || 'Untitled'
        const isFavorite = favoriteDocIds.has(entry.id)
        const trackedStatus = trackedAnime.find((item) => item.animeId === entry.id)?.status

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

              {entry.genres && entry.genres.length > 0 ? (
                <div className="anime-card__genres" aria-label="Anime genres">
                  {entry.genres.slice(0, 3).map((genre) => (
                    <span key={`${entry.id}-${genre}`} className="anime-card__genre">
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="anime-card__tracker">
                {(['finished', 'queued', 'rewatch'] as TrackerStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={trackedStatus === status ? 'tracker-chip tracker-chip--active' : 'tracker-chip'}
                    onClick={() => onStatusChange(entry.id, title, entry.coverImage.large ?? '', status)}
                  >
                    {status}
                  </button>
                ))}
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

              {trackedStatus ? (
                <button
                  type="button"
                  className="watchlist-remove watchlist-remove--compact"
                  onClick={() => onStatusRemove(entry.id)}
                >
                  clear status
                </button>
              ) : null}
            </div>
          </article>
        )
      })}

      <div className="pagination" aria-label="Anime pagination">
        <button type="button" className="pagination__button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
          Previous
        </button>
        <span className="pagination__status">
          Page {page} / {totalPages}
        </span>
        <button type="button" className="pagination__button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
          Next
        </button>
      </div>
    </section>
  )
}

export default AnimeList
