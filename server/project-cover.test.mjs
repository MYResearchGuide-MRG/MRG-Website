import assert from "node:assert/strict"
import { test } from "node:test"
import sharp from "sharp"
import { projectCoverHandler } from "./project-cover.mjs"

test("public covers resize once and recheck publication and version on every cache path", async t => {
  const jpg = await sharp({create:{width:1500,height:750,channels:3,background:"#29859c"}}).jpeg().toBuffer()
  const version = "910aa030-fdfa-456a-a9d5-42b3950e8217"
  const env = { VITE_SUPABASE_URL: "https://example.test", VITE_SUPABASE_PUBLISHABLE_KEY: "public" }
  let published = true
  const queries = []
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.deepEqual(options.headers, {apikey:"public"})
    assert.equal(url.searchParams.get("project_id"), "eq.test-one")
    assert.equal(url.searchParams.get("cache_version"), "eq." + version)
    const fields = url.searchParams.get("select")
    queries.push(fields)
    return Response.json(!published ? [] : [fields === "cache_version" ? {cache_version:version} : {cover:"data:image/jpeg;base64,"+jpg.toString("base64")}])
  })
  async function request(headers = {}, id = "test-one") {
    const res = {headers:{},setHeader(k,v){this.headers[k]=v},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers);return this},end(body){this.body=body}}
    await projectCoverHandler({method:"GET",url:"/?id="+id+"&v="+version,headers},res,env)
    return res
  }
  const first = await request()
  assert.equal(first.status,200)
  assert.match(first.headers["Cache-Control"],/private, no-cache/)
  const meta = await sharp(first.body).metadata()
  assert.deepEqual([meta.format,meta.width,meta.height],["webp",720,360])
  const warm = await request()
  assert.deepEqual(warm.body,first.body)
  const validator = {"if-none-match": first.headers.ETag}
  assert.equal((await request(validator)).status,304)
  published = false
  assert.equal((await request()).status,404)
  assert.equal((await request(validator)).status,404)
  assert.equal((await request({},"bad.id")).status,400)
  assert.deepEqual(queries,["cover:content->>coverImage",...Array(4).fill("cache_version")])
})
