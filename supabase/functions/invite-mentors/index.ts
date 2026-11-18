import { serveAccountInvitations } from "../_shared/account-invitations.ts"

serveAccountInvitations({
  noun: "mentors",
  table: "myssp_mentors",
  claim: "myssp_claim_mentor_invitation",
  flag: "myssp_mentor",
  // A mentor login must not also be a committee or participant login.
  otherRoles: ["myssp_participants"],
})
