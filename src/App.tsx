import AnimeList from './components/AnimeList'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__eyebrow">Anime Tracker</p>
        <h1>Popular anime</h1>
      </header>
      <AnimeList />
    </main>
  )
}

export default App
