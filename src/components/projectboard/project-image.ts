async function prepareImage(file: File, kind: "project" | "portrait"): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.")
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.")
  const bitmap = await createImageBitmap(file)
  try {
    const portrait = kind === "portrait"
    const sourceSize = Math.min(bitmap.width, bitmap.height)
    const scale = Math.min(1, 1600 / bitmap.width, 1000 / bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = portrait
      ? Math.min(512, sourceSize)
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
    const data = canvas.toDataURL("image/jpeg", 0.8)
    if (data.length > (portrait ? 350_000 : 1_500_000))
      throw new Error("This image is too large to save locally. Try a smaller image.")
    return data
  } finally {
    bitmap.close()
  }
}

export const prepareProjectImage = (file: File) => prepareImage(file, "project")
export const prepareMemberPhoto = (file: File) => prepareImage(file, "portrait")
