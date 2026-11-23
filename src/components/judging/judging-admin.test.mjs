import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import ts from "typescript"

function fixture(preview = false) {
  let previewData = { judges: [], lineups: {}, switches: {}, reviews: {} }
  const transport = {
    userId: "admin",
    isAdmin: true,
    detailReads: 0,
    metadataReads: 0,
    gate: null,
    offline: false,
  }
  let authChange
  const exports = {}
  const supabase = {
    auth: {
      onAuthStateChange: (fn) => {
        authChange = fn
      },
    },
    rpc: async () => ({
      data: [{ year: 2026, judging_open: false, feedback_released: false }],
      error: null,
    }),
    from: (table) => {
      let columns
      const query = {
        select: (value) => {
          columns = value
          return query
        },
        order: () => query,
        then: async (resolve, reject) => {
          if (table === "myssp_judge_feedback")
            columns === "*"
              ? transport.detailReads++
              : transport.metadataReads++
          await transport.gate
          const result = transport.offline
            ? { data: null, error: { message: "Offline" } }
            : {
                error: null,
                data:
                  table === "myssp_judge_feedback"
                    ? [
                        {
                          judge_id: "judge",
                          project_id: "one",
                          updated_at: "v1",
                          research_remarks: "Private",
                          presentation_remarks: "Notes",
                        },
                      ]
                    : [],
              }
          return Promise.resolve(result).then(resolve, reject)
        },
      }
      return query
    },
  }
  const source = ts.transpileModule(
    readFileSync(new URL("./judging-admin.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText
  runInNewContext(source, {
    exports,
    require: (name) =>
      name === "@/lib/supabase"
        ? { supabase }
        : name === "../admin/backend"
          ? { getBackend: () => transport }
          : name === "./judging-preview"
            ? {
                judgingPreviewMode: preview,
                readPreview: () => previewData,
                writePreview: (data) => { previewData = data },
                onPreviewChange: () => {},
              }
            : name === "./form"
              ? { scoreKeys: [] }
              : {},
    console,
    Date,
    Promise,
    Set,
    Map,
  })
  return {
    api: exports,
    transport,
    previewData: () => previewData,
    signOut: () => {
      transport.userId = null
      transport.isAdmin = false
      authChange("SIGNED_OUT", null)
    },
  }
}
test("committee refresh is deduplicated, unchanged remarks are not downloaded, and sign-out clears private data", async () => {
  const { api, transport, signOut } = fixture()
  await Promise.all(
    Array.from({ length: 100 }, () => api.refreshCommitteeJudging())
  )
  assert.equal(transport.metadataReads, 1)
  assert.equal(transport.detailReads, 1)
  await api.refreshCommitteeJudging()
  assert.equal(transport.detailReads, 1)
  assert.equal(api.getCommitteeJudging().reviews[0].researchRemarks, "Private")
  let release
  transport.gate = new Promise((r) => (release = r))
  const pending = api.refreshCommitteeJudging()
  signOut()
  release()
  await pending
  assert.equal(api.getCommitteeJudging().reviews.length, 0)
})
test("ordinary request failures do not tell admins to rerun migrations", async () => {
  const { api, transport } = fixture()
  transport.offline = true
  await api.refreshCommitteeJudging()
  assert.match(api.getCommitteeJudging().error, /connection/)
  assert.doesNotMatch(api.getCommitteeJudging().error, /migration/)
})

test("preview lineup starts marking atomically and keeps feedback private until release", async () => {
  const { api, previewData } = fixture(true)
  await api.setLineup(2026, [])
  assert.equal(previewData().switches[2026].judgingOpen, false)
  await api.setLineup(2026, ["one", "two"])
  assert.equal(previewData().switches[2026].judgingOpen, true)
  assert.equal(previewData().switches[2026].feedbackReleased, false)
  await assert.rejects(() => api.setLineup(2026, ["one"]), /Close judging/)
  await api.setSwitches(2026, { judgingOpen: false, feedbackReleased: true })
  await assert.rejects(() => api.setLineup(2026, ["one"]), /Hide released feedback/)
  assert.equal(previewData().switches[2026].feedbackReleased, true)
  await api.setSwitches(2026, { judgingOpen: false, feedbackReleased: false })
  await api.setLineup(2026, ["one"])
  assert.equal(previewData().switches[2026].judgingOpen, true)
  assert.deepEqual(previewData().lineups[2026], ["one"])
})
