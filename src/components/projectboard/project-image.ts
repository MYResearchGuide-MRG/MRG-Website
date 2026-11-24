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
    let width = portrait
      ? Math.min(320, sourceSize)
      : Math.max(1, Math.round(bitmap.width * scale))
    let height = portrait ? width : Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) throw new Error("This browser could not process the image.")
    // Keep JPEG compatibility with existing validation. Bound the saved size,
    // including base64 overhead. Resize detailed images instead of requiring
    // another upload or falling back to very low JPEG quality.
    const budget = portrait ? 36_000 : 160_000
    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = width
      canvas.height = height
      context.fillStyle = "#000"
      context.fillRect(0, 0, width, height)
      if (portrait) {
        context.drawImage(bitmap, (bitmap.width - sourceSize) / 2, (bitmap.height - sourceSize) / 2,
          sourceSize, sourceSize, 0, 0, width, height)
      } else {
        context.drawImage(bitmap, 0, 0, width, height)
      }
      for (const quality of [0.78, 0.7, 0.62]) {
        const data = canvas.toDataURL("image/jpeg", quality)
        if (data.startsWith("data:image/jpeg;base64,") && data.length <= budget) return data
      }
      width = Math.max(1, Math.round(width * 0.8))
      height = Math.max(1, Math.round(height * 0.8))
    }
    throw new Error("This image has too much detail to compress. Try a smaller image.")
  } finally {
    bitmap.close()
  }
}

export const prepareProjectImage = (file: File) => prepareImage(file, "project")
export const prepareMemberPhoto = (file: File) => prepareImage(file, "portrait")
