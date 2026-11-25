// The judge pages run on one of two sources: the real Demo Day lineup, or the
// practice lineup of sample projects (practice.ts). Pages read everything
// through the source they are given, so practice answers can never reach the
// real save calls.
import { createContext, useContext } from "react"
import type { Board, Draft } from "../projectboard/data"
import type { FeedbackAnswers } from "./form"
import {
  getJudgeAccess,
  saveReview,
  submitAllReviews,
  useJudgeAccess,
  type JudgeAccessState,
  type JudgeReview,
} from "./judge-access"
import {
  judgingHash,
  judgingProjectHash,
  useLineupBoards,
  useProjectContent,
} from "./lineup"
import {
  getPracticeAccess,
  practiceBoards,
  practiceContent,
  practiceHash,
  practiceProjectHash,
  savePracticeReview,
  submitAllPracticeReviews,
  usePracticeAccess,
} from "./practice"

export type JudgingSource = {
  practice: boolean
  useAccess: () => JudgeAccessState
  getAccess: () => JudgeAccessState
  useBoards: () => Board[]
  useContent: (board: Board | undefined) => Draft | undefined
  saveReview: (
    projectId: string,
    answers: FeedbackAnswers,
    submit: boolean,
    expectedUpdatedAt: string | null
  ) => Promise<JudgeReview>
  submitAllReviews: () => Promise<number>
  lineupHash: string
  projectHash: (projectId: string) => string
}

export const liveSource: JudgingSource = {
  practice: false,
  useAccess: useJudgeAccess,
  getAccess: getJudgeAccess,
  useBoards: useLineupBoards,
  useContent: useProjectContent,
  saveReview,
  submitAllReviews,
  lineupHash: judgingHash,
  projectHash: judgingProjectHash,
}

const useBoards = () => practiceBoards
export const practiceSource: JudgingSource = {
  practice: true,
  useAccess: usePracticeAccess,
  getAccess: getPracticeAccess,
  useBoards,
  useContent: practiceContent,
  saveReview: (projectId, answers, submit) =>
    savePracticeReview(projectId, answers, submit),
  submitAllReviews: submitAllPracticeReviews,
  lineupHash: practiceHash,
  projectHash: practiceProjectHash,
}

export const JudgingSourceContext = createContext<JudgingSource>(liveSource)
export const useJudgingSource = () => useContext(JudgingSourceContext)

// Set when a judge who can't submit yet is sent to a review to finish it. The
// review page then jumps to the first unanswered question and labels each one.
// It names the review it was set for, so it can never apply to another one.
let fixingHash: string | null = null
export const openToFixMissing = (hash: string) => {
  fixingHash = hash
  window.location.hash = hash
}
export const isFixingMissing = () =>
  fixingHash !== null && fixingHash === window.location.hash
export const clearFixingMissing = () => {
  fixingHash = null
}
