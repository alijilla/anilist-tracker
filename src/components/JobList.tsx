import { useEffect, useState } from 'react'

export interface Job {
  id: number
  url: string
  title: string
  company_name: string
  company_logo: string
  category: string
  tags: string[]
  job_type: string
  publication_date: string
  candidate_required_location: string
  salary: string
  description: string
}

interface RemotiveJobsResponse {
  jobs?: Job[]
}

function JobList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchJobs = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('https://remotive.com/api/remote-jobs', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = (await response.json()) as RemotiveJobsResponse
        setJobs(payload.jobs ?? [])
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name === 'AbortError') {
          return
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Something went wrong while fetching jobs.',
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchJobs()

    return () => controller.abort()
  }, [])

  if (loading) {
    return <div className="job-list__state">Loading remote jobs...</div>
  }

  if (error) {
    return (
      <div className="job-list__state job-list__state--error">
        Error loading jobs: {error}
      </div>
    )
  }

  if (jobs.length === 0) {
    return <div className="job-list__state">No jobs available right now.</div>
  }

  return (
    <section className="job-list" aria-live="polite">
      {jobs.map((job) => (
        <article className="job-card" key={job.id}>
          <div className="job-card__header">
            <div className="job-card__details">
              <h2>{job.title}</h2>
              <p className="job-card__company">{job.company_name}</p>
            </div>
          </div>

          <dl className="job-card__meta">
            <div>
              <dt>Location</dt>
              <dd>{job.candidate_required_location || 'Remote'}</dd>
            </div>
            <div>
              <dt>Salary</dt>
              <dd>{job.salary || 'Not disclosed'}</dd>
            </div>
          </dl>

          <a className="job-card__link" href={job.url} target="_blank" rel="noreferrer">
            View listing
          </a>
        </article>
      ))}
    </section>
  )
}

export default JobList
