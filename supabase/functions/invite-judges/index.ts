import { serveAccountInvitations } from "../_shared/account-invitations.ts"

serveAccountInvitations({
  noun: "judges",
  table: "myssp_judges",
  claim: "myssp_claim_judge_invitation",
  flag: "myssp_judge",
  // A judge login must not also be a committee, participant or mentor login.
  otherRoles: ["myssp_participants", "myssp_mentors"],
})
