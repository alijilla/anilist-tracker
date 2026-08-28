import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import AnimeList from './components/AnimeList'
import FavoritesList from './components/FavoritesList'
import Login from './components/Login'
import { auth } from './firebase'
import './App.css'

type ViewMode = 'browse' | 'favorites'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('browse')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    setView('browse')
  }

  if (authLoading) {
    return <div className="app-shell app-shell--loading">Loading...</div>
  }

  if (!user) {
    return <Login />
  }

  return (
    <main className="app-shell">
      <header className="app-shell__header app-shell__header--logged-in">
        <div>
          <p className="app-shell__eyebrow">Anime Tracker</p>
          <h1>Popular anime</h1>
        </div>

        <div className="app-shell__user-bar">
          <span className="app-shell__email">{user.email}</span>
          <button className="app-shell__logout" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="view-toggle" aria-label="View switcher">
        <button
          type="button"
          className={view === 'browse' ? 'view-toggle__button view-toggle__button--active' : 'view-toggle__button'}
          onClick={() => setView('browse')}
        >
          Browse
        </button>
        <button
          type="button"
          className={view === 'favorites' ? 'view-toggle__button view-toggle__button--active' : 'view-toggle__button'}
          onClick={() => setView('favorites')}
        >
          My Favorites
        </button>
      </div>

      {view === 'browse' ? <AnimeList user={user} /> : <FavoritesList user={user} />}
    </main>
  )
}

export default App
