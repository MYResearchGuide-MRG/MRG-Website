// Practice judging: sample projects a judge can mark before Demo Day to learn
// the flow. Everything stays in this browser tab (sessionStorage). Nothing is
// sent to the database or the committee, and nothing counts towards results.
import { useSyncExternalStore } from "react"
import { boards, type Board, type Draft } from "../projectboard/data"
import {
  missingAnswers,
  withoutPresentation,
  type FeedbackAnswers,
} from "./form"
import {
  getJudgeAccess,
  researchOnlyJudge,
  reviewComplete,
  type JudgeAccessState,
  type JudgeReview,
} from "./judge-access"

export const practiceHash = "#/judging/practice"
export const practiceProjectHash = (projectId: string) =>
  `${practiceHash}/${projectId}`

type Sample = {
  id: string
  code: string
  track: string
  title: string
  mentor: string
  affiliation: string
  team: { name: string; school: string }[]
  summary: string
}

const samples: Sample[] = [
  {
    id: "practice-river-plastics",
    code: "P-1",
    track: "Biology",
    title: "Counting microplastics in a city river with a phone microscope",
    mentor: "Dr. Sample Mentor",
    affiliation: "Practice project",
    team: [
      { name: "Aisha Rahman", school: "Sample Secondary School" },
      { name: "Daniel Lim", school: "Sample Secondary School" },
    ],
    summary:
      "We built a low-cost clip-on microscope for a phone and used it to count microplastic particles in water samples taken at five points along a city river over four weeks.\n\nParticle counts rose downstream of two drainage outlets and after heavy rain. We compare our counts with a lab filter method on ten samples and discuss where the phone method over- and under-counts.\n\n*This is a sample project for practice judging. It is not a real submission.*",
  },
  {
    id: "practice-study-timer",
    code: "P-2",
    track: "AI & Computer Sciences",
    title: "Does a smart study timer help students focus longer?",
    mentor: "Dr. Sample Mentor",
    affiliation: "Practice project",
    team: [
      { name: "Wei Jie Tan", school: "Sample College" },
      { name: "Priya Nair", school: "Sample College" },
      { name: "Hafiz Ismail", school: "Sample College" },
    ],
    summary:
      "We trained a small model on phone-usage logs to suggest when a student should take a break, and tested it against a fixed 25-minute timer with 24 volunteers over two weeks.\n\nStudents using the adaptive timer reported slightly longer focus sessions, but the difference was within the noise of our small sample. We explain the limits of self-reported focus and what a larger study would need.\n\n*This is a sample project for practice judging. It is not a real submission.*",
  },
]

const template = boards[0]
export const practiceBoards: Board[] = samples.map((sample) => ({
  ...template,
  id: sample.id,
  code: sample.code,
  track: sample.track,
  title: sample.title,
  mentor: sample.mentor,
  affiliation: sample.affiliation,
  description: sample.summary,
  awards: [],
  team: [],
}))

const drafts: Record<string, Draft> = Object.fromEntries(
  samples.map((sample) => [
    sample.id,
    {
      version: 1,
      projectId: sample.id,
      title: sample.title,
      teamMembers: sample.team.map((person, index) => ({
        id: `${sample.id}:member-${index + 1}`,
        name: person.name,
        school: person.school,
        bio: "",
        photo: "",
      })),
      summary: sample.summary,
      overviewFormat: "markdown",
      question: "",
      method: "",
      findings: "",
      slides: "",
      paper: "",
      video: "",
      savedAt: null,
    } satisfies Draft,
  ])
)
export const practiceContent = (board: Board | undefined) =>
  board ? drafts[board.id] : undefined

// Store ------------------------------------------------------------------------
const storageKey = (judgeId: string) => `myssp-judge-practice-v1:${judgeId}`
const ids = practiceBoards.map((board) => board.id)

let state: JudgeAccessState | null = null
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
function publish(next: JudgeAccessState) {
  state = next
  if (next.judge)
    try {
      sessionStorage.setItem(
        storageKey(next.judge.id),
        JSON.stringify(next.reviews)
      )
    } catch {
      /* storage blocked: practice still works for this page view */
    }
  listeners.forEach((fn) => fn())
}

function storedReviews(judgeId: string): Record<string, JudgeReview> {
  try {
    const raw = sessionStorage.getItem(storageKey(judgeId))
    const parsed = raw ? (JSON.parse(raw) as Record<string, JudgeReview>) : {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([id]) => ids.includes(id))
    )
  } catch {
    return {}
  }
}

/** The practice state for the signed-in judge, always open for marking. */
export function getPracticeAccess(): JudgeAccessState {
  const real = getJudgeAccess()
  if (state && state.judge === real.judge && state.ready === real.ready)
    return state
  // Same judge with updated details (e.g. Demo Day attendance): keep their
  // practice answers. A different judge starts from their own saved answers.
  const sameJudge = Boolean(state && state.judge?.id === real.judge?.id)
  state = {
    ready: real.ready,
    judge: real.judge,
    lineup: ids,
    reviews:
      sameJudge && state
        ? state.reviews
        : real.judge
          ? storedReviews(real.judge.id)
          : {},
    researchClosesAt: null,
    judgingOpen: true,
    feedbackReleased: false,
    error: "",
  }
  return state
}
export const usePracticeAccess = () =>
  useSyncExternalStore(subscribe, getPracticeAccess)

export async function savePracticeReview(
  projectId: string,
  answers: FeedbackAnswers,
  submit: boolean
): Promise<JudgeReview> {
  const current = getPracticeAccess()
  if (!current.judge) throw new Error("Sign in as a judge to practise.")
  if (!ids.includes(projectId))
    throw new Error("This sample project isn’t in the practice lineup.")
  const researchOnly = researchOnlyJudge(current.judge)
  if (researchOnly) answers = withoutPresentation(answers)
  if (current.reviews[projectId]?.submittedAt)
    throw new Error(
      "This review has already been submitted and can no longer be changed."
    )
  if (submit && missingAnswers(answers, researchOnly).length)
    throw new Error("Answer every score and add a remark.")
  const now = new Date().toISOString()
  const review: JudgeReview = {
    ...answers,
    researchOnly,
    projectId,
    submittedAt: submit ? now : null,
    updatedAt: now,
  }
  publish({ ...current, reviews: { ...current.reviews, [projectId]: review } })
  return review
}

export async function submitAllPracticeReviews() {
  const current = getPracticeAccess()
  if (!current.judge) throw new Error("Sign in as a judge to practise.")
  const researchOnly = researchOnlyJudge(current.judge)
  if (ids.some((id) => !reviewComplete(current.reviews[id], researchOnly)))
    throw new Error(
      "Complete every team's review before submitting all reviews."
    )
  const now = new Date().toISOString()
  publish({
    ...current,
    reviews: Object.fromEntries(
      Object.entries(current.reviews).map(([id, review]) => [
        id,
        review.submittedAt
          ? review
          : { ...review, submittedAt: now, updatedAt: now },
      ])
    ),
  })
  return ids.length
}

/** Clears every practice answer so the judge can go through it again. */
export function resetPractice() {
  const current = getPracticeAccess()
  publish({ ...current, reviews: {} })
}
