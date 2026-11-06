import * as React from "react"
import { DropdownMenu } from "radix-ui"
import { ArrowUpRight, Check, ChevronDown, Copy } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { projectCodes, projects, type Project } from "@/data/competition-data"
import styles from "./projects.module.css"

const providers = [
  {
    name: "Claude",
    icon: "/brands/claude-color.svg",
    href: "https://claude.ai/new",
  },
  { name: "ChatGPT", icon: "/brands/openai.svg", href: "https://chatgpt.com/" },
  {
    name: "Gemini",
    icon: "/brands/gemini-color.svg",
    href: "https://gemini.google.com/",
  },
]
const codes = projectCodes(projects)

/** Include the actual briefs so the assistant can compare projects even before the site is deployed. */
function comparisonPrompt(list: Project[]) {
  return [
    "Help me explore the Malaysia Science Scholar’s Programme (MYSSP) projects. Start by asking about my STEM interests, current skills and weekly availability, then help me compare suitable projects from the list below. Explain the work, prerequisites and trade-offs in plain language. Do not invent projects, assume applications are open, or promise admission.",
    "Programme information: https://myssp.myresearchguide.org/\nProject catalogue: https://myssp.myresearchguide.org/#/projects\nMYResearchGuide: https://myresearchguide.org/",
    `${list.length === 1 ? "This is the project" : `These are the ${list.length} projects`} currently in my filtered view:`,
    ...list.map((project) =>
      [
        `${project.code || codes.get(project.id)}: ${project.title}`,
        `Cohort: ${project.year || 2026}. Field: ${project.track}. Research area: ${project.type}.`,
        `Mentor: ${project.mentor}, ${project.affiliation}.`,
        `Time commitment: ${project.timeInvestment}. Team size: ${project.participants}.`,
        `Project brief: ${project.description}`,
        `Skills: ${project.skillsDescription}`,
        project.preferences ? `Mentor preferences: ${project.preferences}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n\n")
}

export function ProjectAdvisor({ visible }: { visible: Project[] }) {
  const [providerName, setProviderName] = React.useState("Claude")
  const [status, setStatus] = React.useState<
    "idle" | "copying" | "copied" | "manual"
  >("idle")
  const provider = providers.find((item) => item.name === providerName)!
  const prompt = comparisonPrompt(visible)
  const promptRef = React.useRef<HTMLTextAreaElement>(null)

  async function copyPrompt() {
    setStatus("copying")
    try {
      await navigator.clipboard.writeText(prompt)
      setStatus("copied")
    } catch {
      setStatus("manual")
      promptRef.current?.focus()
      promptRef.current?.select()
    }
  }

  return (
    <div className={styles.advisor}>
      <p>Not sure where to start?</p>
      <div className={styles.aiSplit}>
        <Dialog onOpenChange={() => setStatus("idle")}>
          <DialogTrigger asChild>
            <button
              type="button"
              className={styles.askButton}
              disabled={visible.length === 0}
            >
              <img src={provider.icon} alt="" width={18} height={18} />
              Ask {provider.name}
            </button>
          </DialogTrigger>
          <DialogContent
            className={`${styles.aiDialog} ${styles.animatedDialog}`}
            overlayClassName={styles.dialogOverlay}
          >
            <DialogTitle className={styles.aiTitle}>
              Explore projects with {provider.name}
            </DialogTitle>
            <DialogDescription className={styles.aiDescription}>
              Copy this prompt, then paste it into {provider.name}. It includes
              the {visible.length}{" "}
              {visible.length === 1 ? "project" : "projects"} in your current
              view.
            </DialogDescription>
            <textarea
              ref={promptRef}
              aria-label="Project comparison prompt"
              readOnly
              value={prompt}
              className={styles.prompt}
            />
            <div className={styles.aiActions}>
              <button
                type="button"
                onClick={copyPrompt}
                disabled={status === "copying"}
              >
                {status === "copied" ? (
                  <Check size={16} aria-hidden />
                ) : (
                  <Copy size={16} aria-hidden />
                )}
                {status === "copied"
                  ? "Copied"
                  : status === "copying"
                    ? "Copying…"
                    : "Copy prompt"}
              </button>
              <a href={provider.href} target="_blank" rel="noopener noreferrer">
                Open {provider.name} <ArrowUpRight size={16} aria-hidden />
              </a>
            </div>
            <p role="status" className={styles.copyStatus}>
              {status === "copied"
                ? `Prompt copied. Paste it into ${provider.name} to get started.`
                : status === "manual"
                  ? "Copy the selected text manually, then paste it into your chat."
                  : "Nothing is sent automatically."}
            </p>
          </DialogContent>
        </Dialog>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={styles.aiSelect}
              aria-label="Choose AI assistant"
            >
              <ChevronDown size={16} aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={styles.aiMenu}
              sideOffset={7}
              align="end"
              collisionPadding={16}
            >
              <DropdownMenu.RadioGroup
                value={providerName}
                onValueChange={setProviderName}
              >
                {providers.map((item) => (
                  <DropdownMenu.RadioItem
                    key={item.name}
                    value={item.name}
                    className={styles.aiOption}
                  >
                    <img src={item.icon} alt="" width={18} height={18} />
                    {item.name}
                    <DropdownMenu.ItemIndicator
                      className={styles.providerCheck}
                    >
                      <Check size={14} />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}
