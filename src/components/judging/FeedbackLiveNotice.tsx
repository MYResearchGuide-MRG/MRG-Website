import { Radio } from "lucide-react"

/** Tells a judge that teams can now read the feedback they gave. */
export default function FeedbackLiveNotice({
  judgingOpen,
}: {
  judgingOpen: boolean
}) {
  return (
    <div
      role="status"
      className="judge-callout-soft-accent mt-4 flex w-full items-start gap-3 rounded-lg px-4 py-3 text-sm"
    >
      <Radio size={16} className="mt-0.5 flex-none" aria-hidden />
      <div>
        <p className="font-medium">Feedback is live to teams</p>
        <p className="judge-callout-body mt-1">
          Teams can now see each submitted score and both section reviews
          on their project page, without your name.
          {judgingOpen &&
            " Judging is still open, so any change you submit now shows to the team straight away."}
        </p>
      </div>
    </div>
  )
}
