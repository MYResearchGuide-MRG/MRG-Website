import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const source = readFileSync(new URL("./materials.ts", import.meta.url), "utf8")
const { materialEmbed, materialError, linkService, validAdditionalMaterials, webUrl } =
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
  assert.equal(materialEmbed("slides", "https://canva.com/design/DAExample/shareToken/edit"), null)
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
