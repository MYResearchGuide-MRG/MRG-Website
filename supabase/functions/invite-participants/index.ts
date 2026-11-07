import { createClient } from "npm:@supabase/supabase-js@2"

const url = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
const cors = {"Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS"}
const reply = (data:unknown, status=200) => new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}})

// The six-character code is a persistent password. Never return it to the
// browser or write it to logs.
function accessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
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
    if (!Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 50 || body.ids.some((id:unknown)=>typeof id!=="string" || !/^[a-f0-9-]{36}$/.test(id))) return reply({error:"Choose 1 to 50 participants"},400)
    const ids = [...new Set(body.ids)]
    const service = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const query = await service.from("myssp_participants").select("id,email,user_id,revoked").in("id",ids)
    if (query.error) return reply({error:"Could not load participants"},500)
    let sent = 0, failed = ids.length - (query.data?.length || 0)
    for (const person of query.data || []) {
      try {
        const claim = await service.rpc("myssp_claim_invitation",{person:person.id})
        if (person.revoked || claim.error || claim.data !== true) { failed++; continue }
        const code = accessCode()
        let authId = person.user_id as string | null
        let originalMetadata: Record<string,unknown> = {}
        if (authId) {
          const current = await service.auth.admin.getUserById(authId)
          if (current.error || current.data.user?.email?.toLowerCase() !== person.email) { failed++; continue }
          const admin = await service.from("myssp_admins").select("user_id").eq("user_id", authId).maybeSingle()
          if (admin.error || admin.data) { failed++; continue }
          originalMetadata = current.data.user.user_metadata || {}
        } else {
          // Refuse to reset an unrelated Auth account that shares this email.
          const existing = await service.rpc("myssp_auth_user_for_email",{address:person.email})
          if (existing.error || existing.data) { failed++; continue }
          const result = await service.auth.admin.createUser({
            email:person.email, password:code, email_confirm:true,
            user_metadata:{myssp_participant:true},
          })
          if (result.error || !result.data.user) { failed++; continue }
          authId = result.data.user.id
          const linked = await service.from("myssp_participants").update({user_id:authId}).eq("id",person.id).is("user_id",null).select("id")
          if (linked.error || linked.data?.length !== 1) {
            await service.auth.admin.deleteUser(authId)
            failed++
            continue
          }
          originalMetadata = result.data.user.user_metadata || {}
        }
        // Auth templates can read metadata. Remove the plaintext credential
        // immediately after the email is rendered.
        const metadata = {...originalMetadata,myssp_participant:true,myssp_access_code:code}
        const prepared = await service.auth.admin.updateUserById(authId!,{
          password:code,user_metadata:metadata,
        })
        if (prepared.error) { failed++; continue }
        const mailClient = createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}})
        // Auth merges metadata updates, so explicitly remove the transient key.
        const cleanMetadata: Record<string,unknown> = {...metadata,myssp_access_code:null}
        let delivered = false
        try {
          const delivery = await mailClient.auth.resetPasswordForEmail(person.email)
          delivered = !delivery.error
        } finally {
          const cleaned = await service.auth.admin.updateUserById(authId!,{user_metadata:cleanMetadata})
          if (cleaned.error) delivered = false
        }
        if (!delivered) { failed++; continue }
        await service.from("myssp_participants").update({invited_at:new Date().toISOString()}).eq("id",person.id)
        sent++
      } catch { failed++ }
    }
    return reply({sent,failed})
  } catch { return reply({error:"Invitation request failed"},400) }
})
