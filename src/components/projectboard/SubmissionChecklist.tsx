import { useId, useState } from "react"
import { Check, ChevronDown, Circle, ArrowUpRight, Clock3 } from "lucide-react"
import type { Board, Draft } from "./data"
import { submissionChecklist, submissionReviewed, type ChecklistSection } from "./submission-checklist"
import "./submission-checklist.css"

export function SubmissionChecklist({board, draft, editing, editable, deadline, onOpen, onReview}: {
  board: Board; draft: Draft; editing: boolean; editable: boolean;
  deadline: {closed:boolean; label:string};
  onOpen: (section:ChecklistSection) => void; onReview: (reviewed:boolean) => void;
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const items = submissionChecklist(board, draft)
  const ready = items.every(item => item.done)
  const reviewed = ready && submissionReviewed(draft)
  const complete = items.filter(item => item.done).length + Number(reviewed)
  const total = items.length + 1
  return <section className="pb-checklist" aria-label="Submission checklist">
    <button className="pb-checklist-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <div><strong>Submission checklist</strong><span>{complete} of {total} complete{editing ? " · Unsaved work included" : ""}</span></div>
      <div className="pb-checklist-due"><Clock3 size={15} aria-hidden /><span>{deadline.closed ? "Editing closed" : deadline.label ? `Due ${deadline.label}` : "Complete before submission"}</span><ChevronDown size={17} className={open ? "is-open" : ""} aria-hidden /></div>
    </button>
    <div className="pb-checklist-progress" role="progressbar" aria-label="Required items completed" aria-valuenow={complete} aria-valuemin={0} aria-valuemax={total}><span style={{width:`${complete / total * 100}%`}} /></div>
    <div className="pb-checklist-reveal" data-open={open} inert={!open} aria-hidden={!open} id={id}><div className="pb-checklist-clip"><div className="pb-checklist-body">
      <p>{deadline.closed ? "The deadline has passed. Your saved page remains available to view. Contact the committee if a correction is needed." : "Your saved page is your submission. Complete every required item and save your changes before the deadline. Additional materials are optional."}</p>
      <ul>{items.map(item => <li key={item.id} data-complete={item.done}>
        {item.done ? <Check size={17} aria-label="Complete" /> : <Circle size={17} aria-label="To do" />}
        <div><strong>{item.label}</strong><span>{item.detail}</span></div>
        <button aria-label={`${item.done ? "Review" : "Complete"} ${item.label}`} onClick={() => onOpen(item.section)}>{editable ? item.done ? "Review" : "Edit" : "View"}<ArrowUpRight size={13} aria-hidden /></button>
      </li>)}</ul>
      <label className="pb-checklist-review"><input type="checkbox" checked={reviewed} disabled={!editing || !editable || !ready} onChange={event => onReview(event.target.checked)} /><span><strong>Final review</strong><span>I checked the title, all written content, every team member's details and photo. I opened all three materials in a signed-out window and checked their contents, sharing settings and the submission rules.</span></span></label>
      <p className="pb-checklist-note">{reviewed ? editing ? "Save changes to record this review." : "Review saved. Changing required content will reopen the final review." : !ready ? "Complete the items above to enable the final review. Link format checks cannot verify sharing permissions or file contents." : !editing && editable ? "Choose Edit project to record your final review." : "Confirm your final review, then save changes."}</p>
    </div></div></div>
  </section>
}
