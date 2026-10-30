// Shrinks a buyer's photo in the browser before it's sent for photo search:
// max 768px, JPEG. Small and fast on Nigerian data, and drawing it on a canvas
// also drops hidden details like the phone's GPS location.
export async function shrinkPhoto(file: File, maxSide = 768): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background instead of black
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.75);
}
