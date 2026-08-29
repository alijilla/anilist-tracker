import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import AnimeList from './components/AnimeList'
import FavoritesList from './components/FavoritesList'
import Login from './components/Login'
import { auth, db } from './firebase'
import './App.css'

type ViewMode = 'discover' | 'watchlist' | 'favorites'
type TrackerStatus = 'finished' | 'queued' | 'rewatch'

interface TrackedAnimeItem {
  animeId: number
  title: string
  coverImage: string
  status: TrackerStatus
  hoursWatched: number
}

const STORAGE_KEY_PREFIX = 'watchies-tracker-'

const getDefaultHours = (status: TrackerStatus) => {
  switch (status) {
    case 'finished':
      return 24
    case 'rewatch':
      return 18
    case 'queued':
      return 8
    default:
      return 0
  }
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('discover')
  const [searchTerm, setSearchTerm] = useState('')
  const [trackedAnime, setTrackedAnime] = useState<TrackedAnimeItem[]>([])
  const [favoriteCount, setFavoriteCount] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    const saved = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${user.uid}`)

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TrackedAnimeItem[]
        setTrackedAnime(parsed)
      } catch {
        setTrackedAnime([])
      }
    } else {
      setTrackedAnime([])
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      return
    }

    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${user.uid}`,
      JSON.stringify(trackedAnime),
    )
  }, [trackedAnime, user])

  useEffect(() => {
    if (!user) {
      setFavoriteCount(0)
      return
    }

    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid),
    )

    const unsubscribe = onSnapshot(favoritesQuery, (snapshot) => {
      setFavoriteCount(snapshot.size)
    })

    return () => unsubscribe()
  }, [user])

  const totalHoursWatched = useMemo(
    () =>
      trackedAnime
        .filter((anime) => anime.status === 'finished' || anime.status === 'rewatch')
        .reduce((total, anime) => total + anime.hoursWatched, 0),
    [trackedAnime],
  )

  const streak = useMemo(
    () => Math.min(7, trackedAnime.filter((anime) => anime.status !== 'queued').length),
    [trackedAnime],
  )

  const finishedCount = trackedAnime.filter((anime) => anime.status === 'finished').length
  const queuedCount = trackedAnime.filter((anime) => anime.status === 'queued').length
  const rewatchCount = trackedAnime.filter((anime) => anime.status === 'rewatch').length

  const handleLogout = async () => {
    await signOut(auth)
    setView('discover')
    setSearchTerm('')
  }

  const handleStatusChange = (animeId: number, title: string, coverImage: string, status: TrackerStatus) => {
    setTrackedAnime((currentTracking) => {
      const existing = currentTracking.find((item) => item.animeId === animeId)

      if (existing) {
        return currentTracking.map((item) =>
          item.animeId === animeId
            ? {
                ...item,
                status,
                hoursWatched: getDefaultHours(status),
              }
            : item,
        )
      }

      return [
        ...currentTracking,
        {
          animeId,
          title,
          coverImage,
          status,
          hoursWatched: getDefaultHours(status),
        },
      ]
    })
  }

  const handleStatusRemove = (animeId: number) => {
    setTrackedAnime((currentTracking) =>
      currentTracking.filter((item) => item.animeId !== animeId),
    )
  }

  if (authLoading) {
    return <div className="app-shell app-shell--loading">Loading...</div>
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="watchies-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__mark">☾</div>
          <div className="brand__copy">
            <span className="brand__name">watchies</span>
            <small className="brand__tag">cozy nights</small>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <button type="button" className={view === 'discover' ? 'nav-pill nav-pill--active' : 'nav-pill'} onClick={() => setView('discover')}>
            discover
          </button>
          <button type="button" className={view === 'watchlist' ? 'nav-pill nav-pill--active' : 'nav-pill'} onClick={() => setView('watchlist')}>
            watchlist
          </button>
          <button type="button" className={view === 'favorites' ? 'nav-pill nav-pill--active' : 'nav-pill'} onClick={() => setView('favorites')}>
            favorites
          </button>
        </nav>

        <div className="sidebar__stat">
          <span className="sidebar__label">total hours watched</span>
          <strong>{totalHoursWatched.toFixed(1)}h</strong>
          <small>+{Math.max(0, totalHoursWatched - 18).toFixed(1)} this moon</small>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <label className="search-pill" aria-label="Search titles">
            <span className="search-pill__icon">⌕</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="search titles"
            />
          </label>

          <div className="topbar__actions">
            <button type="button" className="icon-button" aria-label="Notifications">
              🔔
            </button>
            <div className="avatar" aria-label="User avatar">
              🐈
            </div>
            <span className="user-label">{user.email}</span>
            <button className="logout-button" type="button" onClick={handleLogout}>
              logout
            </button>
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-card__copy">
            <p className="eyebrow">keep it up~ ✨</p>
            <h2>continue watching</h2>
            <p className="hero-card__text">{trackedAnime.length ? 'Your watchlist is glowing again~' : 'No shows in the queue yet — add one to start your streak.'}</p>
            <div className="progress-pill">
              <span className="progress-pill__label">{trackedAnime.length ? `${trackedAnime.length} titles tracked` : 'ready to start'}</span>
              <div className="progress-pill__track">
                <span className="progress-pill__fill" style={{ width: `${Math.min(100, trackedAnime.length * 12)}%` }} />
              </div>
            </div>
          </div>

          <div className="hero-card__meta">
            <span className="hero-card__badge">✦ {Math.min(99, Math.round(totalHoursWatched * 2))}%</span>
            <span className="hero-card__badge hero-card__badge--mint">♥</span>
          </div>
        </section>

        <section className="streak-card">
          <div className="streak-card__header">
            <p className="eyebrow">streak</p>
            <span className="streak-card__days">{streak} days</span>
          </div>

          <div className="streak-row">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <span key={day + index} className={index < streak ? 'flame-pill flame-pill--on' : 'flame-pill'}>
                {index < streak ? '🔥' : day}
              </span>
            ))}
          </div>
        </section>

        <section className="stats-grid" aria-label="Stats overview">
          <div className="mini-stat mini-stat--pink">
            <span className="mini-stat__icon">★</span>
            <div>
              <strong>{finishedCount}</strong>
              <small>finished</small>
            </div>
          </div>
          <div className="mini-stat mini-stat--lilac">
            <span className="mini-stat__icon">✦</span>
            <div>
              <strong>{queuedCount}</strong>
              <small>queued</small>
            </div>
          </div>
          <div className="mini-stat mini-stat--mint">
            <span className="mini-stat__icon">♥</span>
            <div>
              <strong>{favoriteCount}</strong>
              <small>favorites</small>
            </div>
          </div>
          <div className="mini-stat mini-stat--butter">
            <span className="mini-stat__icon">☾</span>
            <div>
              <strong>{rewatchCount}</strong>
              <small>rewatches</small>
            </div>
          </div>
        </section>

        <section className="library-panel">
          <div className="library-panel__header">
            <div>
              <p className="eyebrow">watching now</p>
              <h3>{view === 'discover' ? 'discover' : view === 'watchlist' ? 'watchlist' : 'my favorites'}</h3>
            </div>

            <div className="view-toggle" aria-label="View switcher">
              <button
                type="button"
                className={view === 'discover' ? 'view-toggle__button view-toggle__button--active' : 'view-toggle__button'}
                onClick={() => setView('discover')}
              >
                Discover
              </button>
              <button
                type="button"
                className={view === 'watchlist' ? 'view-toggle__button view-toggle__button--active' : 'view-toggle__button'}
                onClick={() => setView('watchlist')}
              >
                Watchlist
              </button>
              <button
                type="button"
                className={view === 'favorites' ? 'view-toggle__button view-toggle__button--active' : 'view-toggle__button'}
                onClick={() => setView('favorites')}
              >
                Favorites
              </button>
            </div>
          </div>

          {view === 'discover' ? (
            <AnimeList
              user={user}
              searchTerm={searchTerm}
              trackedAnime={trackedAnime}
              onStatusChange={handleStatusChange}
              onStatusRemove={handleStatusRemove}
            />
          ) : null}

          {view === 'watchlist' ? (
            <div className="watchlist-panel">
              {trackedAnime.length === 0 ? (
                <div className="anime-list__state">No anime in your watchlist yet.</div>
              ) : (
                trackedAnime.map((anime) => (
                  <div className="watchlist-item" key={anime.animeId}>
                    <img src={anime.coverImage || ''} alt={anime.title} className="watchlist-item__cover" />
                    <div className="watchlist-item__content">
                      <strong>{anime.title}</strong>
                      <span>{anime.hoursWatched}h logged</span>
                    </div>
                    <div className="watchlist-item__actions">
                      {(['finished', 'queued', 'rewatch'] as TrackerStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={anime.status === status ? 'watchlist-status watchlist-status--active' : 'watchlist-status'}
                          onClick={() => handleStatusChange(anime.animeId, anime.title, anime.coverImage, status)}
                        >
                          {status}
                        </button>
                      ))}
                      <button type="button" className="watchlist-remove" onClick={() => handleStatusRemove(anime.animeId)}>
                        remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {view === 'favorites' ? <FavoritesList user={user} /> : null}
        </section>
      </main>
    </div>
  )
}

export default App
