import { Radio } from "lucide-react"

/** Tells a judge that teams can now read the feedback they gave. */
export default function FeedbackLiveNotice({ judgingOpen }: { judgingOpen: boolean }) {
  return <div role="status" className="mt-4 flex max-w-2xl items-start gap-3 rounded-md border border-sky-400/30 bg-sky-400/[0.07] px-4 py-3 text-sm">
    <Radio size={16} className="mt-0.5 flex-none text-sky-300" aria-hidden />
    <div>
      <p className="font-medium text-sky-100">Feedback is live to teams</p>
      <p className="mt-1 text-zinc-300">
        Teams can now see the average of each score and every submitted remark on their project page, without your name.
        {judgingOpen && " Judging is still open, so any change you submit now shows to the team straight away."}
      </p>
    </div>
  </div>
}
