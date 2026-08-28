import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'

interface FavoriteItem {
  id: string
  userId: string
  animeId: number
  title: string
  coverImage: string
}

interface FavoritesListProps {
  user: User
}

function FavoritesList({ user }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid),
    )

    const unsubscribe = onSnapshot(
      favoritesQuery,
      (snapshot) => {
        const nextFavorites = snapshot.docs.map((document) => {
          const data = document.data() as Partial<FavoriteItem>

          return {
            id: document.id,
            userId: data.userId ?? user.uid,
            animeId: data.animeId ?? 0,
            title: data.title ?? 'Untitled',
            coverImage: data.coverImage ?? '',
          }
        })

        setFavorites(nextFavorites)
        setLoading(false)
        setError(null)
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user.uid])

  const handleRemoveFavorite = async (favorite: FavoriteItem) => {
    try {
      setRemovingId(favorite.id)
      setError(null)
      await deleteDoc(doc(db, 'favorites', favorite.id))
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Something went wrong while removing the favorite.',
      )
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return <div className="anime-list__state">Loading favorites...</div>
  }

  if (error) {
    return (
      <div className="anime-list__state anime-list__state--error">
        Error loading favorites: {error}
      </div>
    )
  }

  if (favorites.length === 0) {
    return <div className="anime-list__state">No favorites saved yet.</div>
  }

  return (
    <section className="anime-list" aria-live="polite">
      {favorites.map((favorite) => (
        <article className="anime-card" key={favorite.id}>
          <img
            className="anime-card__cover"
            src={favorite.coverImage || ''}
            alt={favorite.title}
          />

          <div className="anime-card__content">
            <div className="anime-card__header">
              <h2>{favorite.title}</h2>
            </div>

            <button
              className="favorite-button favorite-button--danger"
              type="button"
              disabled={removingId === favorite.id}
              onClick={() => void handleRemoveFavorite(favorite)}
            >
              {removingId === favorite.id ? 'Removing...' : 'Remove from favorites'}
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}

export default FavoritesList
