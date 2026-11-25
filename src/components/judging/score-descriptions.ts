import type { ScoreKey } from "./form"

// Official MYSSP 2026 judging rubric, indexed by criterion and score.
export const scoreDescriptions: Record<
  ScoreKey,
  Record<1 | 2 | 3 | 4 | 5, string>
> = {
  data_collection: {
    5: "Data is systematically collected, thoroughly documented, and sufficient in scale for the claims made. Execution is consistent, rigorous, and reproducible.",
    4: "Data is well collected and documented, with only minor gaps in scale, consistency, or reproducibility that do not materially affect the work.",
    3: "Data collection and execution are adequate overall, but some gaps in documentation, scale, or consistency limit the strength of the evidence.",
    2: "Data collection shows notable weaknesses, such as insufficient scale, inconsistent procedures, or poor documentation, which weaken the conclusions.",
    1: "Data collection is minimal, unreliable, or poorly documented and is insufficient to support meaningful conclusions.",
  },
  analysis: {
    5: "Analytical techniques are correctly applied and appropriate for the data. Conclusions are directly supported by the results, with uncertainty and limitations clearly acknowledged.",
    4: "Analysis is sound and appropriate, and conclusions are well supported. Minor gaps in depth, precision, or treatment of uncertainty are present.",
    3: "Analysis is generally acceptable, but contains some errors, omissions, or weak interpretation. Conclusions remain broadly defensible with caution.",
    2: "Analysis is only partially correct or incomplete. Conclusions overreach the data, or important analytical steps are missing or flawed.",
    1: "Analysis is absent or substantially incorrect, and the conclusions are not supported by the data.",
  },
  findings_validity: {
    5: "Findings are clear, internally consistent, and strongly supported by the evidence. Validity concerns are appropriately addressed and the main claims are credible.",
    4: "Findings are well supported and credible overall, with only minor inconsistencies or validation gaps that do not undermine the main conclusions.",
    3: "Findings are plausible and partially supported, but limitations, uncertainty, or incomplete validation reduce confidence in some conclusions.",
    2: "Findings are weakly supported, inconsistent, or affected by important validity issues that are not adequately resolved.",
    1: "Findings are unreliable or unsupported, with major validity problems preventing meaningful conclusions.",
  },
  structure: {
    5: "The presentation follows a clear, logical flow from motivation to conclusion. All key elements are covered at appropriate depth within the available time.",
    4: "The structure is clear and logical, with only minor issues in sequencing, depth, or pacing. Nearly all key elements are covered effectively.",
    3: "The presentation is understandable overall, but some sections are rushed, out of balance, weakly connected, or missing detail.",
    2: "The structure is difficult to follow, with several key elements missing, poorly ordered, or inadequately covered.",
    1: "The presentation is largely unstructured, with significant content gaps that prevent a coherent understanding of the work.",
  },
  clarity: {
    5: "Concepts are communicated clearly and at an appropriate level. Technical terms are defined, and the audience is guided through complex ideas effectively.",
    4: "The explanation is mostly clear and accessible, with only minor instances of jargon, over-explanation, or under-explanation.",
    3: "The presentation is understandable overall, but clarity is inconsistent, and several concepts require better explanation or context.",
    2: "Frequent sections are unclear or inaccessible, and the explanation often assumes prior knowledge from the audience.",
    1: "The presentation is largely unclear or inaccessible, making the research difficult to understand.",
  },
  qa_depth: {
    5: "All team members demonstrate thorough understanding of the work. Questions are answered accurately and confidently, including those on execution decisions, results, and limitations.",
    4: "The team demonstrates strong understanding and handles most questions accurately. Minor gaps in depth, confidence, or precision are evident.",
    3: "The team shows adequate understanding and can answer straightforward questions, but depth or accuracy is uneven across more challenging questions.",
    2: "Responses are partial, uncertain, or reveal limited understanding of substantial parts of the work. Knowledge may be uneven across team members.",
    1: "The team is unable to respond meaningfully to judges’ questions or demonstrates insufficient understanding of the project.",
  },
  visual_aids: {
    5: "Slides are clear, polished, and not overcrowded. Visuals directly support the spoken content, and figures are legible, well labelled, and referenced appropriately.",
    4: "Slides are effective and mostly clear, with only minor issues in density, consistency, legibility, or use of figures.",
    3: "Visuals are adequate but contain some clutter, excessive text, or occasional misalignment with the spoken explanation. Most figures remain understandable.",
    2: "Slides are frequently cluttered, difficult to read, or poorly aligned with the spoken content, limiting their usefulness to the audience.",
    1: "Visual aids are absent or significantly detract from the presentation and the audience’s understanding.",
  },
  time_management: {
    5: "The presentation is completed comfortably within the 12-minute slot, with balanced pacing and sufficient time given to all major sections.",
    4: "The presentation is completed within the time limit, with only minor pacing issues that do not meaningfully affect clarity or coverage.",
    3: "The presentation is completed around the allotted time, but noticeable rushing, slow sections, or uneven time allocation affects delivery.",
    2: "The presentation runs notably over or under time, or is heavily rushed, causing important sections to be compromised.",
    1: "The presentation is not completed within the allotted time or shows severe time-management problems that substantially affect the presentation.",
  },
}
