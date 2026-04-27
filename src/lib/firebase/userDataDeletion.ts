const deletingUserIds = new Set<string>();

export function beginUserDataDeletion(uid: string) {
  deletingUserIds.add(uid);
}

export function endUserDataDeletion(uid: string) {
  deletingUserIds.delete(uid);
}

export function isUserDataDeletionInProgress(uid: string) {
  return deletingUserIds.has(uid);
}
