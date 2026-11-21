import { scoreKeys, type JudgeKind, type TeamReview } from "../judging/form"
import { randomizeReviews } from "./feedback-summary"

function example(
  kind: JudgeKind,
  scores: number[],
  researchRemarks: string,
  presentationRemarks: string
): TeamReview {
  return {
    ...Object.fromEntries(scoreKeys.map((key, i) => [key, scores[i]])),
    kind,
    researchRemarks,
    presentationRemarks,
  } as TeamReview
}

// Fictional feedback, never written to project submissions or judging records.
const samples: TeamReview[] = [
  example(
    "main",
    [4, 4, 5, 4, 5, 4, 4, 4],
    "The controlled occlusion levels made the comparisons convincing. Your examples show clearly where the detector starts to struggle. Add the number of images in each group and explain how the confidence threshold was chosen.",
    "The before-and-after images were easy to follow, and the team explained the limitations honestly. Leave a little more time for the conclusion and explain what a missed detection means before showing the metrics."
  ),
  example(
    "main",
    [4, 4, 4, 4, 4, 3, 5, 4],
    "A clear research question and a sensible evaluation setup. The plots support the main conclusion. Repeating the analysis with a second object detector would help show whether the pattern is specific to this model.",
    "The visual examples were particularly effective. The explanation of the experimental setup was concise. During Q&A, distinguish observations from possible explanations when discussing why performance dropped."
  ),
  example(
    "main",
    [5, 4, 5, 4, 5, 4, 5, 4],
    "The test set is organised well and the comparison across object types is a useful contribution. I appreciated the inclusion of failure cases. Show uncertainty around your reported detection rates, especially for smaller groups.",
    "Strong coordination between speakers and clear answers about the scope of the work. The figures were readable and supported the argument. A single slide connecting the results to practical applications would strengthen the ending."
  ),
  example(
    "main",
    [4, 3, 4, 4, 4, 4, 4, 4],
    "The project was scoped realistically and the results address the stated question. A more detailed description of the annotation process would make it easier to reproduce. Discuss whether background or lighting could explain some differences.",
    "The presentation followed a logical sequence and stayed within time. Explain the evaluation metric with one simple example before introducing the full results. The team's response to questions about limitations was thoughtful."
  ),
  example(
    "special",
    [5, 4, 5, 4, 5, 4, 5, 4],
    "The reproducible test setup is a strong feature. For future work, package the evaluation as a small script with clear inputs and outputs so another team can test a different model using the same protocol.",
    "The demonstrations made the technical work accessible. Include a brief workflow diagram to connect data preparation, model predictions and analysis, and state which parts another user could reuse."
  ),
  example(
    "special",
    [4, 4, 4, 4, 4, 4, 5, 4],
    "You made good use of a manageable experiment to investigate a practical reliability issue. The distinction between partial and severe occlusion was useful. Consider how this experiment could be extended to more realistic settings.",
    "The main message was clear to a non-specialist audience. The team handled questions constructively. Reduce the terminology on the methods slide and include a plain-language description alongside each metric."
  ),
  example(
    "special",
    [4, 5, 4, 4, 5, 4, 4, 5],
    "The comparative analysis was carefully presented. I would like to see a clearer separation of exploratory findings from the questions defined before the experiment. Keep the raw observations available with the final report.",
    "The pacing was controlled and the conclusion linked back to the original question. Your answers showed good understanding of the analysis. A short worked example would help the audience understand how each detection was scored."
  ),
]

export function exampleFeedback(): TeamReview[] {
  return randomizeReviews(samples)
}
