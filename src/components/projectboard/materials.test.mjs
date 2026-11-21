import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const source = readFileSync(new URL("./materials.ts", import.meta.url), "utf8")
const { materialEmbed, materialError, linkService, validAdditionalMaterials, webUrl, canvaLinkFromPaste } =
  await import(
    `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
  )
test("YouTube watch, shared, Shorts, live and embed links resolve to the same player", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=M7lc1UVf-VE&feature=shared",
    "https://youtu.be/M7lc1UVf-VE?si=test",
    "https://m.youtube.com/shorts/M7lc1UVf-VE",
    "https://youtube.com/live/M7lc1UVf-VE",
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=1",
  ]) {
    assert.equal(
      materialEmbed("video", url)?.src,
      "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0&playsinline=1"
    )
  }
})
test("Canva accepts full view links and preserves the public share path", () => {
  assert.deepEqual(
    materialEmbed(
      "slides",
      "https://www.canva.com/design/DAExample/shareToken/view?utm_source=test"
    ),
    {
      href: "https://www.canva.com/design/DAExample/shareToken/view",
      src: "https://www.canva.com/design/DAExample/shareToken/view?embed",
    }
  )
  assert.ok(materialEmbed("slides", "https://canva.com/design/DAExample/view?embed"))
  assert.ok(materialEmbed("slides", "https://canva.com/design/DAExample/shareToken/edit"))
  assert.equal(materialEmbed("slides", "https://canva.link/test"), null)
})
test("Drive files become previews, preserve resource keys, and reject folders/Docs", () => {
  assert.deepEqual(
    materialEmbed(
      "paper",
      "https://drive.google.com/file/d/example_file_id/view?usp=sharing&resourcekey=0-abc123"
    ),
    {
      href: "https://drive.google.com/file/d/example_file_id/view?resourcekey=0-abc123",
      src: "https://drive.google.com/file/d/example_file_id/preview?resourcekey=0-abc123",
    }
  )
  assert.ok(materialEmbed("paper", "https://drive.google.com/open?id=example_file_id"))
  assert.equal(
    materialEmbed("paper", "https://drive.google.com/drive/folders/example_file_id"),
    null
  )
  assert.equal(
    materialEmbed("paper", "https://docs.google.com/document/d/example_file_id/edit"),
    null
  )
})
test("Embeds reject lookalike hosts, credentials, HTML and unsafe schemes", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "<iframe src='https://youtube.com'></iframe>",
    "https://youtube.com.attacker.test/watch?v=M7lc1UVf-VE",
    "https://youtube.com@attacker.test/watch?v=M7lc1UVf-VE",
    "https://user:password@youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtube.com:123/watch?v=M7lc1UVf-VE",
    "https://youtube.com/watch?v=M7lc1UVf-VE%22%3E",
  ])
    assert.equal(materialEmbed("video", value), null)
  assert.equal(materialEmbed("slides", "https://canva.com.attacker.test/design/test/view"), null)
  assert.equal(
    materialEmbed("paper", "https://drive.google.com.attacker.test/file/d/example_file_id/view"),
    null
  )
  assert.equal(materialError("video", ""), null)
  assert.ok(materialError("video", "https://example.com/movie.mp4"))
})

test("material-specific providers accept common share variants and reject wrong destinations", () => {
  const accepted={video:['https://youtu.be/M7lc1UVf-VE','https://youtube.com/live/M7lc1UVf-VE'],slides:['https://canva.link/xr1tgcwosi65q23','https://www.canva.com/design/ABC/token/edit','https://www.canva.com/design/ABC/token/watch'],paper:['https://drive.google.com/file/d/file_123/view','https://drive.google.com/file/u/0/d/file_123/preview?resourcekey=token','https://drive.google.com/open?id=file_123']}
  for(const [key,urls] of Object.entries(accepted)) for(const url of urls) assert.equal(materialError(key,url),null,`${key}: ${url}`)
  for(const key of ['video','slides','paper']) for(const url of ['https://example.com/file','https://drive.google.com/drive/folders/abc','https://canva.com/','https://youtube.com/','javascript:alert(1)','https://drive.google.com.attacker.test/file/d/file_123/view','https://canva.com@attacker.test/design/ABC/view']) assert.ok(materialError(key,url),`${key}: ${url}`)
  assert.ok(materialError('paper','https://docs.google.com/document/d/example/edit'))
  assert.ok(materialError('slides','https://youtu.be/M7lc1UVf-VE'))
  for (const [key, urls] of Object.entries(accepted)) {
    for (const otherKey of ['video', 'slides', 'paper'].filter(value => value !== key)) {
      for (const url of urls) {
        assert.ok(materialError(otherKey, url), `${otherKey} must reject a ${key} provider: ${url}`)
        assert.equal(materialEmbed(otherKey, url), null)
      }
    }
  }
  for (const url of ['https://docs.google.com/presentation/d/example/edit?usp=sharing','https://docs.google.com/presentation/d/e/example/pub']) {
    assert.ok(materialError('slides', url))
    assert.equal(materialEmbed('slides', url), null)
  }
  assert.equal(linkService('https://canva.link/xr1tgcwosi65q23').icon,'canva')
})

test("Additional materials support ordinary links with bounded, valid named records", () => {
  const link = { id: "one", name: "Code repository", url: "https://github.com/example/research" }
  assert.ok(validAdditionalMaterials([link]))
  assert.ok(validAdditionalMaterials([]))
  for (const invalid of [
    [{ ...link, name: "  " }],
    [{ ...link, url: "javascript:alert(1)" }],
    [link, link],
    Array.from({ length: 11 }, (_, i) => ({ ...link, id: String(i) })),
    [{ ...link, url: "x".repeat(2049) }],
  ])
    assert.equal(validAdditionalMaterials(invalid), false)
  assert.equal(webUrl("https://user:pass@example.com"), null)
  assert.equal(linkService(link.url).icon, "github")
  assert.equal(linkService("https://drive.google.com/file/d/example_file_id/view").icon, "drive")
  assert.equal(linkService("https://github.com.example.com").icon, "web")
})

test("pasting Canva embed HTML extracts only a supported design URL", () => {
  const url = "https://www.canva.com/design/ABC/shareToken/view"
  assert.equal(canvaLinkFromPaste(` <div style="color:red"><iframe src="${url}?embed&amp;utm_source=test" allowfullscreen></iframe></div><script>alert(1)</script>`), url)
  assert.equal(canvaLinkFromPaste(`<iframe src='${url}?embed'></iframe>`), url)
  assert.equal(canvaLinkFromPaste(" https://canva.com/design/ABC/shareToken/edit?utm_source=share "), url)
  assert.equal(canvaLinkFromPaste(" https://canva.link/example "), "https://canva.link/example")
  for(const source of ["https://attacker.test/design/ABC/view", "https://canva.com.attacker.test/design/ABC/view", "https://user:pass@canva.com/design/ABC/view", "javascript:alert(1)", "data:text/html,test"])
    assert.equal(canvaLinkFromPaste(`<iframe src="${source}"></iframe>`), null)
  assert.equal(canvaLinkFromPaste("<script>alert(1)</script>"), null)
  assert.equal(canvaLinkFromPaste("x".repeat(20_001)), null)
})
