async function prepareImage(file: File, kind: "project" | "portrait"): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.")
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.")
  const bitmap = await createImageBitmap(file)
  try {
    const portrait = kind === "portrait"
    const sourceSize = Math.min(bitmap.width, bitmap.height)
    const scale = Math.min(1, 1280 / bitmap.width, 800 / bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = portrait
      ? Math.min(320, sourceSize)
      : Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = portrait ? canvas.width : Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("This browser could not process the image.")
    context.fillStyle = "#000"
    context.fillRect(0, 0, canvas.width, canvas.height)
    if (portrait) {
      context.drawImage(
        bitmap,
        (bitmap.width - sourceSize) / 2,
        (bitmap.height - sourceSize) / 2,
        sourceSize,
        sourceSize,
        0,
        0,
        canvas.width,
        canvas.height
      )
    } else {
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    }
    // Keep JPEG compatibility with existing validation. Bound the saved size,
    // including base64 overhead, rather than accepting multi-megabyte photos.
    const budget = portrait ? 90_000 : 400_000
    let data = canvas.toDataURL("image/jpeg", 0.76)
    for (const quality of [0.66, 0.56, 0.46]) {
      if (data.length <= budget) break
      data = canvas.toDataURL("image/jpeg", quality)
    }
    if (data.length > budget)
      throw new Error("This image has too much detail to compress. Try a smaller image.")
    return data
  } finally {
    bitmap.close()
  }
}

export const prepareProjectImage = (file: File) => prepareImage(file, "project")
export const prepareMemberPhoto = (file: File) => prepareImage(file, "portrait")
