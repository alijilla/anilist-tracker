import JobList from './components/JobList'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__eyebrow">Remote work</p>
        <h1>Open roles</h1>
      </header>
      <JobList />
    </main>
  )
}

export default App
