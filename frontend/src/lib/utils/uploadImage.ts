// lib/utils/uploadImage.ts

export async function uploadImage(dataUrl: string): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Missing Cloudinary env vars");
  }

  const formData = new FormData();
  formData.append("file", dataUrl);
  formData.append("upload_preset", uploadPreset);

  // optional folder
  formData.append("folder", "cleancity");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const json = await res.json();

  if (!res.ok || !json.secure_url) {
    console.error("Cloudinary upload error:", json);
    throw new Error(json?.error?.message || "Image upload failed");

  }

  // always prefer https
  return json.secure_url as string;
}






// export async function uploadImage(dataUrl: string): Promise<string> {
//   // dataUrl = "data:image/jpeg;base64,...."
//   const base64 = dataUrl.split(",")[1];

//   const formData = new FormData();
//   formData.append("image", base64);

//   const res = await fetch(
//     `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
//     {
//       method: "POST",
//       body: formData,
//     }
//   );

//   const json = await res.json();
//   if (!json.success) {
//     throw new Error("Image upload failed");
//   }

//   return json.data.url; // https://i.ibb.co/...
// }