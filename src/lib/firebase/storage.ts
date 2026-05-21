import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  type UploadMetadata,
} from "firebase/storage";
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

export function detectBackgroundMediaType(
  file: File
): BackgroundMediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.at(-1)?.trim().toLowerCase() || "";
}

export async function uploadBackgroundMedia(
  file: File,
  mediaType: BackgroundMediaType
): Promise<{ url: string; storagePath: string }> {
  const validation = validateFileSize(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const storage = getStorage();
  const timestamp = Date.now();
  const extension = getFileExtension(file.name);
  const fileSuffix = extension ? `.${extension}` : "";
  const fileName = `${mediaType}-${timestamp}-${Math.random().toString(36).slice(2, 9)}${fileSuffix}`;
  const storagePath = `users/${user.uid}/backgrounds/${mediaType}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  const metadata: UploadMetadata = file.type
    ? { contentType: file.type }
    : {};

  // Upload the file
  await uploadBytes(storageRef, file, metadata);

  // Get and return the download URL
  const downloadUrl = await getDownloadURL(storageRef);
  return { url: downloadUrl, storagePath };
}

export async function deleteBackgroundFile(storagePath: string): Promise<void> {
  const storage = getStorage();
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

export type StorageBackgroundItem = {
  url: string;
  storagePath: string;
  type: BackgroundMediaType;
};

export async function listAllBackgroundFiles(uid: string): Promise<StorageBackgroundItem[]> {
  const storage = getStorage();
  const results: StorageBackgroundItem[] = [];

  for (const mediaType of ["image", "video"] as BackgroundMediaType[]) {
    const folderRef = ref(storage, `users/${uid}/backgrounds/${mediaType}`);
    try {
      const listResult = await listAll(folderRef);
      const items = await Promise.allSettled(
        listResult.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return { url, storagePath: item.fullPath, type: mediaType };
        })
      );
      results.push(
        ...items
          .filter((item): item is PromiseFulfilledResult<StorageBackgroundItem> => item.status === "fulfilled")
          .map((item) => item.value)
      );
    } catch (err) {
      console.warn(`Failed to list ${mediaType} backgrounds`, err);
      // folder may not exist yet
    }
  }

  return results;
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
