const thumbnails = import.meta.glob<string>("../assets/mentor-thumbnails/*.webp", {
  eager: true, query: "?url&no-inline", import: "default",
})

export function mentorPortrait(photo: string) {
  const name = /^\/mentors\/([a-z0-9-]+)\.jpg$/.exec(photo)?.[1]
  return thumbnails[`../assets/mentor-thumbnails/${name}.webp`] || photo
}
