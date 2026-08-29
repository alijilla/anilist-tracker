# AI-Assisted Development Notes

## How AI assisted throughout the build

This app (browse anime via the AniList GraphQL API, log in/out, save
favorites) was built using GitHub Copilot Chat as the primary development
tool, working feature by feature: data fetching, then authentication,
then per-user favorites. Each feature started as a single detailed prompt
specifying the component, the data source, the exact fields to display,
and required states (loading/error/empty) — a pattern carried over from
an earlier prompting-comparison drill, where vague prompts were shown to
produce broken or mismatched output and precise prompts produced working,
on-spec code on the first try. All prompts used are logged in
`PROMPTS.md`.

AI handled the bulk of implementation: component structure, TypeScript
interfaces, Firebase SDK calls (`signInWithEmailAndPassword`,
`onAuthStateChanged`, `signOut`), and Firestore read/write logic. This
freed up review time to focus on whether the *behavior* was correct,
rather than typing boilerplate by hand.

## Examples of manual corrections after reviewing AI-generated code

**1. Firestore permission error.** After the favorites feature was
generated and wired up, saving a favorite failed in the browser with
`Missing or insufficient permissions`. The AI-generated Firestore write
code itself was correct, but the *security rules* (a separate
configuration, not something the component code controls) were left in
Firestore's default test-mode state, which didn't match how the app was
querying data. This was diagnosed by checking the browser console for the
exact error, then reading Firestore's Rules tab directly, and fixing it
by writing explicit rules restricting reads/writes to documents where
`request.auth.uid` matches the favorite's stored `userId`. This was not
something the AI flagged proactively — it required manually reproducing
the bug and inspecting Firebase's own console to catch.

**2. Encoding/formatting cleanup.** Early in development, a
Notepad-edited README with em-dashes and an emoji was committed with
garbled encoding artifacts (e.g. `â€”` instead of `-`) after the file was
saved with the wrong text encoding. This wasn't AI-generated content, but
it's a direct example of catching an issue through review rather than
assuming a save succeeded — the fix was rewriting the affected file with
plain ASCII characters and explicitly verifying the saved output before
committing.

**3. Commit hygiene.** A few commits landed with a generic message
(`"push"`) instead of following Conventional Commits, made from a
separate local clone of the repo outside the normal workflow. This was
caught by reviewing `git log` before pushing further work and comparing
it against the intended commit history — a reminder to `cd` into a single
consistent project folder rather than letting a second clone accumulate
untracked changes.

## Overall takeaway

AI was fastest and most reliable when given a fully-specified prompt
(exact fields, exact API shape, required UI states) — matching the
lesson from the earlier prompting drill. The parts of the project that
needed manual intervention weren't flaws in the generated *code* so much
as configuration living outside the code (Firestore security rules,
Firebase console settings) that AI has no visibility into unless
explicitly told, plus ordinary development hygiene (verifying saves,
watching for duplicate local clones) that stays a human responsibility
regardless of how much of the code itself is AI-written.