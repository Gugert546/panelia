import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "./client";

export type BackgroundMediaType = "image" | "video";

// 100 MB limit
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxSizeMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    return {
      valid: false,
      error: `File size ${fileSizeMB} MB exceeds maximum allowed size of ${maxSizeMB} MB`,
    };
  }
  return { valid: true };
}

export async function uploadBackgroundMedia(
  file: File,
  mediaType: BackgroundMediaType
): Promise<string> {
  const validation = validateFileSize(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const storage = getStorage();
  const timestamp = Date.now();
  const fileName = `${mediaType}-${timestamp}-${Math.random().toString(36).slice(2, 9)}`;
  const storagePath = `users/${user.uid}/backgrounds/${mediaType}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  // Upload the file
  await uploadBytes(storageRef, file);

  // Get and return the download URL
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

export function isValidBackgroundUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("blob:")) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
