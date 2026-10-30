// Runs on the vendor's phone before upload.
// Shrinks a photo to at most 1600px on its longest side and saves it as JPEG.
// Why: a 6 MB phone photo becomes about 300 KB, so uploads are fast on mobile data,
// storefronts load fast for buyers, and redrawing the photo removes hidden
// location data (GPS) that phones store inside pictures.

export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This phone couldn't process the photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This phone couldn't process the photo."))),
      "image/jpeg",
      quality,
    );
  });
}
