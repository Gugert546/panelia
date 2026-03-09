import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./client";
import type { CalendarEvent } from "../../types/firestore";
import type { Bookmark, BookmarkCategory } from "../../types/firestore";

const eventsRef = (uid: string) => collection(db, "users", uid, "calendarEvents");

type UpdateEventOptions = {
  expectedUpdatedAt?: number;
  markPending?: boolean;
};

type DeleteEventOptions = {
  expectedUpdatedAt?: number;
};

export class CalendarConflictError extends Error {
  constructor(message = "Calendar event was modified by another client") {
    super(message);
    this.name = "CalendarConflictError";
  }
}

function toMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as { toMillis?: () => number };
    if (typeof maybeTimestamp.toMillis === "function") {
      const millis = maybeTimestamp.toMillis();
      if (Number.isFinite(millis)) return millis;
    }
  }

  return 0;
}

function makeUpdatePayload(patch: Partial<CalendarEvent>, markPending: boolean) {
  const payload: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  };

  if (patch.syncStatus) {
    payload.syncStatus = patch.syncStatus;
  } else if (markPending) {
    payload.syncStatus = "pending";
  }

  return payload;
}

export function subscribeToEvents(uid: string, onData: (events: CalendarEvent[]) => void) {
  return onSnapshot(eventsRef(uid), (snap) => {
    const events = snap.docs
      .map((d) => d.data() as CalendarEvent)
      .filter((event) => !event.deletedAt);

    onData(events);
  });
}

export async function createEvent(uid: string, event: CalendarEvent) {
  await setDoc(doc(eventsRef(uid), event.id), {
    ...event,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateEvent(
  uid: string,
  eventId: string,
  patch: Partial<CalendarEvent>,
  options: UpdateEventOptions = {}
) {
  const { expectedUpdatedAt, markPending = true } = options;
  const ref = doc(eventsRef(uid), eventId);
  const payload = makeUpdatePayload(patch, markPending);

  if (typeof expectedUpdatedAt !== "number") {
    await updateDoc(ref, payload);
    return;
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const currentUpdatedAt = toMillis((snap.data() as Partial<CalendarEvent>).updatedAt);
    if (currentUpdatedAt > expectedUpdatedAt) {
      throw new CalendarConflictError();
    }

    tx.update(ref, payload);
  });
}

export async function deleteEvent(uid: string, eventId: string, options: DeleteEventOptions = {}) {
  const { expectedUpdatedAt } = options;
  const ref = doc(eventsRef(uid), eventId);

  if (typeof expectedUpdatedAt !== "number") {
    await deleteDoc(ref);
    return;
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const currentUpdatedAt = toMillis((snap.data() as Partial<CalendarEvent>).updatedAt);
    if (currentUpdatedAt > expectedUpdatedAt) {
      throw new CalendarConflictError();
    }

    tx.delete(ref);
  });
}

export async function getEventById(uid: string, eventId: string) {
  const ref = doc(eventsRef(uid), eventId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as CalendarEvent) : null;
}

export function resolveLww(current: CalendarEvent, incoming: CalendarEvent): CalendarEvent {
  return incoming.updatedAt >= current.updatedAt ? incoming : current;
}


const categoriesRef = (uid: string) => 
  collection(db, "users", uid, "bookmarkCategories");

const bookmarksRef = (uid: string) => 
  collection(db, "users", uid, "bookmarks");


export function subscribeToCategories(
  uid: string, 
  onData: (categories: BookmarkCategory[]) => void
) {
  return onSnapshot(categoriesRef(uid), (snap) => {
    const categories = snap.docs.map((d) => d.data() as BookmarkCategory);
    onData(categories);
  });
}


export function subscribeToBookmarks(
  uid: string, 
  onData: (bookmarks: Bookmark[]) => void
) {
  return onSnapshot(bookmarksRef(uid), (snap) => {
    const bookmarks = snap.docs.map((d) => d.data() as Bookmark);
    onData(bookmarks);
  });
}


export async function createCategory(uid: string, category: BookmarkCategory) {
  await setDoc(doc(categoriesRef(uid), category.id), {
    ...category,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}


export async function createBookmark(uid: string, bookmark: Bookmark) {
  await setDoc(doc(bookmarksRef(uid), bookmark.id), {
    ...bookmark,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}


export async function updateBookmark(
  uid: string,
  bookmarkId: string,
  patch: Partial<Bookmark>
) {
  const ref = doc(bookmarksRef(uid), bookmarkId);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}


export async function deleteBookmark(uid: string, bookmarkId: string) {
  await deleteDoc(doc(bookmarksRef(uid), bookmarkId));
}


export async function deleteCategory(uid: string, categoryId: string) {
  await deleteDoc(doc(categoriesRef(uid), categoryId));
}
