import { createClient } from "npm:@supabase/supabase-js@2"

const url = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
const cors = {"Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS"}
const reply = (data:unknown, status=200) => new Response(JSON.stringify(data), {status,headers:{...cors,"Content-Type":"application/json"}})

// The code is a persistent password. Keep it off the browser response and logs.
function accessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, byte => alphabet[byte & 31]).join("")
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:cors})
  if (req.method !== "POST") return reply({error:"Method not allowed"},405)
  try {
    const authorization = req.headers.get("Authorization") || ""
    const caller = createClient(url,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}})
    const {data:{user},error:authError} = await caller.auth.getUser()
    if (authError || !user) return reply({error:"Sign in required"},401)
    const role = await caller.rpc("myssp_is_admin")
    if (role.error || role.data !== true) return reply({error:"Admin required"},403)
    const body = await req.json()
    if (!Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 50 || body.ids.some((id:unknown) => typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))) return reply({error:"Choose 1 to 50 judges"},400)
    const ids = [...new Set(body.ids as string[])]
    const service = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const query = await service.from("myssp_judges").select("id,email,user_id,revoked,deleted_at,access_revision").in("id",ids)
    if (query.error) return reply({error:"Could not load judges"},500)
    let sent = 0, failed = ids.length - (query.data?.length || 0)
    for (const judge of query.data || []) {
      try {
        const claim = await service.rpc("myssp_claim_judge_invitation",{target:judge.id})
        if (judge.revoked || judge.deleted_at || claim.error || claim.data !== true) { failed++; continue }
        const code = accessCode()
        let authId = judge.user_id as string | null
        let originalMetadata: Record<string,unknown> = {}
        if (authId) {
          const current = await service.auth.admin.getUserById(authId)
          if (current.error || current.data.user?.email?.toLowerCase() !== judge.email) { failed++; continue }
          const [admin,participant,mentor] = await Promise.all([
            service.from("myssp_admins").select("user_id").eq("user_id",authId).maybeSingle(),
            service.from("myssp_participants").select("id").eq("user_id",authId).maybeSingle(),
            service.from("myssp_mentors").select("id").eq("user_id",authId).maybeSingle(),
          ])
          if (admin.error || participant.error || mentor.error || admin.data || participant.data || mentor.data) { failed++; continue }
          originalMetadata = current.data.user.user_metadata || {}
        } else {
          const existing = await service.rpc("myssp_auth_user_for_email",{address:judge.email})
          if (existing.error || existing.data) { failed++; continue }
          const created = await service.auth.admin.createUser({email:judge.email,password:code,email_confirm:true,user_metadata:{myssp_judge:true}})
          if (created.error || !created.data.user) { failed++; continue }
          authId = created.data.user.id
          const linked = await service.from("myssp_judges").update({user_id:authId}).eq("id",judge.id).eq("email",judge.email).eq("access_revision",judge.access_revision).eq("revoked",false).is("deleted_at",null).is("user_id",null).select("id")
          if (linked.error || linked.data?.length !== 1) {
            await service.auth.admin.deleteUser(authId)
            failed++
            continue
          }
          originalMetadata = created.data.user.user_metadata || {}
        }
        // A concurrent edit/delete must not link or mark an old invitation as sent.
        const latest = await service.from("myssp_judges").select("id")
          .eq("id",judge.id).eq("email",judge.email).eq("user_id",authId)
          .eq("access_revision",judge.access_revision).eq("revoked",false).is("deleted_at",null)
        if (latest.error || latest.data?.length !== 1) { failed++; continue }
        const metadata = {...originalMetadata,myssp_judge:true,myssp_access_code:code}
        const prepared = await service.auth.admin.updateUserById(authId!,{password:code,user_metadata:metadata})
        if (prepared.error) { failed++; continue }
        const mailClient = createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}})
        // Auth merges metadata updates. Null explicitly removes this key;
        // omitting it would leave the plaintext code on the account.
        const cleanMetadata = {...metadata,myssp_access_code:null}
        let delivered = false
        try {
          const delivery = await mailClient.auth.resetPasswordForEmail(judge.email)
          delivered = !delivery.error
        } finally {
          const cleaned = await service.auth.admin.updateUserById(authId!,{user_metadata:cleanMetadata})
          if (cleaned.error) delivered = false
        }
        if (!delivered) { failed++; continue }
        const recorded = await service.from("myssp_judges").update({invited_at:new Date().toISOString()})
          .eq("id",judge.id).eq("email",judge.email).eq("user_id",authId)
          .eq("access_revision",judge.access_revision).eq("revoked",false).is("deleted_at",null).select("id")
        if (recorded.error || recorded.data?.length !== 1) { failed++; continue }
        sent++
      } catch { failed++ }
    }
    return reply({sent,failed})
  } catch { return reply({error:"Invitation request failed"},400) }
})
