import { useId } from "react"
import { ImagePlus } from "lucide-react"
import type { TeamMemberProfile } from "./data"

export function MemberAvatar({ member }: { member: TeamMemberProfile }) {
  const initials = member.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
  return (
    <span className="pb-member-avatar" aria-hidden="true">
      {member.photo ? <img src={member.photo} alt="" /> : <span>{initials || "?"}</span>}
    </span>
  )
}

function TeamMember({
  member,
  index,
  editing,
  uploading,
  onChange,
  onPhoto,
}: {
  member: TeamMemberProfile
  index: number
  editing: boolean
  uploading: boolean
  onChange: (id: string, changes: Partial<Omit<TeamMemberProfile, "id">>) => void
  onPhoto: (id: string, file: File) => void
}) {
  const photoInput = useId()
  return (
    <article className="pb-member-profile" aria-label={`Team member ${index + 1}`}>
      <div className="pb-member-photo-column">
        <MemberAvatar member={member} />
        {editing && (
          <>
            <label className="pb-button pb-image-picker" htmlFor={photoInput}>
              <ImagePlus size={14} /> {member.photo ? "Change photo" : "Add photo"}
              <input
                id={photoInput}
                className="pb-sr-only"
                type="file"
                aria-label={`Photo for team member ${index + 1}`}
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (file) onPhoto(member.id, file)
                }}
              />
            </label>
            {member.photo && (
              <button
                className="pb-text-button"
                disabled={uploading}
                onClick={() => onChange(member.id, { photo: "" })}
              >
                Remove photo
              </button>
            )}
          </>
        )}
      </div>
      {editing ? (
        <div className="pb-member-fields">
          <label className="pb-field">
            Name
            <input
              value={member.name}
              maxLength={100}
              autoComplete="off"
              onChange={(event) => onChange(member.id, { name: event.target.value })}
            />
          </label>
          <label className="pb-field">
            School / institution
            <input
              value={member.school}
              maxLength={200}
              autoComplete="off"
              onChange={(event) => onChange(member.id, { school: event.target.value })}
            />
          </label>
          <label className="pb-field">
            About you
            <textarea
              value={member.bio}
              maxLength={500}
              rows={3}
              placeholder="Your research interests or role in this project"
              onChange={(event) => onChange(member.id, { bio: event.target.value })}
            />
          </label>
        </div>
      ) : (
        <div className="pb-member-copy">
          <h3>{member.name}</h3>
          {member.school && <p>{member.school}</p>}
          {member.bio && <p className="pb-member-bio">{member.bio}</p>}
        </div>
      )}
    </article>
  )
}

export function ProjectTeam({
  members,
  editing,
  uploading,
  onChange,
  onPhoto,
}: {
  members: TeamMemberProfile[]
  editing: boolean
  uploading: boolean
  onChange: (id: string, changes: Partial<Omit<TeamMemberProfile, "id">>) => void
  onPhoto: (id: string, file: File) => void
}) {
  return (
    <div className="pb-member-profiles">
      {members.map((member, index) => (
        <TeamMember
          key={member.id}
          member={member}
          index={index}
          editing={editing}
          uploading={uploading}
          onChange={onChange}
          onPhoto={onPhoto}
        />
      ))}
    </div>
  )
}
