# Student feedback preview

The project page opens released feedback on **Overall**. It shows the average total and all eight criterion averages from main-award reviews, plus separate totals for each special-award review. Special awards are never pooled into the main-award average or into a single special-award result.

**Individual reviews** separates Main award and Special awards. Each numbered review includes all eight original scores, research/presentation subtotals, and both original comments. Numbers and abstract avatars refer only to positions in the current random order. Names, affiliations and judge identifiers are not shown. Switching tabs does not shuffle reviews. Reopening or refreshing feedback may produce a new order through the existing database function.

The committee still closes judging and releases feedback in the Judging panel. Before release, the database returns no reviews and the page shows a locked message. After release, assigned students and mentors see the feedback privately on their project page. This flow does not automatically email scores. No live release setting or score was changed while preparing this preview.

## Local demo

The demo uses fictional scores and comments from four main and three special-award judges. Its controls show the before-release state and shuffle the examples without writing to storage or Supabase.

PowerShell:

```powershell
$env:VITE_ACCESS_MODE='preview'
$env:VITE_FEEDBACK_DEMO='true'
npx vite build --outDir .private/feedback-demo/dist
node scripts/local-preview.mjs --port 5194 --root .private/feedback-demo/dist
```

Open `http://127.0.0.1:5194/#/feedback-demo`. The route requires localhost, preview access mode and the explicit demo build flag. Normal production builds exclude the demo component and its sample content. Do not enable the demo flag in Vercel.

Verification: 131 system tests passed, including main/special separation, averages, random-order preservation, hidden pre-release feedback, identity-free rendering, every criterion and safe comment rendering. Production build and changed-file lint passed. Browser checks covered all seven reviews, category and keyboard navigation, the before-release state, and both views at 390px without horizontal overflow.
