/**
 * Shrinks a camera photo before it's uploaded: phone cameras take 3-12 MB
 * pictures, which can take minutes on a weak mobile signal. Long side at most
 * `max` pixels, JPEG at 80%. Anything that can't be decoded is sent as it is.
 */
export async function shrinkPhoto(file: File, max = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400_000) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg", lastModified: file.lastModified })
  } catch {
    return file
  }
}
