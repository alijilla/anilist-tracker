## Feature: Job Listing (JobList component)

### Prompt 1 — Initial JobList component
**Prompt sent to Copilot Chat:**
"Build a JobList React component in TypeScript that fetches from 
https://remotive.com/api/remote-jobs, shows loading/error/empty states, 
and displays job title, company, location, and salary using this 
interface Job { id: number; url: string; title: string; company_name: string; 
company_logo: string; category: string; tags: string[]; job_type: string; 
publication_date: string; candidate_required_location: string; salary: string; 
description: string; }"

**Outcome:** Worked on first try for data fetching, loading/error/empty 
states, and rendering. Two issues found after manual testing:
1. Company logo images failed to load (Remotive blocks cross-origin 
   image embedding via Cross-Origin-Resource-Policy header) — fixed 
   manually by removing the logo <img> element.
2. Minor dev-mode-only flicker where "No jobs available" briefly shows 
   before jobs load, caused by React StrictMode double-invoking useEffect. 
   Not fixed — cosmetic, dev-only, doesn't affect production behavior.

### Manual Fix — Removed company logo rendering
**Issue:** Logos failed with `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` in 
browser console — Remotive's server blocks cross-origin image embedding. 
Not fixable from the client side.
**Fix:** Removed the <img src={job.company_logo}> element from the job 
card. This was a manual fix, not AI-suggested — found via DevTools console 
and Network tab debugging.

---
## Note: project pivoted from job listings (Remotive API) to 
anime/manga (AniList GraphQL API) on [today's date]. Renamed repo from 
job-tracker-app to anilist-tracker.
---
