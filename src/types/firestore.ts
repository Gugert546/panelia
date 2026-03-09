export type CalendarSyncStatus = "synced" | "pending" | "failed";

export type CalendarEvent = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  allDay: boolean;
  timezone: string;
  source: "local" | "google";
  googleEventId?: string;
  updatedAt: number;      // server epoch ms
  createdAt: number;      // server epoch ms
  deletedAt?: number;     // soft delete for sync safety
  syncStatus: CalendarSyncStatus;
};

export type Bookmark = {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  url: string;
  createdAt: number;  // server epoch ms
  updatedAt: number;  // server epoch ms
};

export type BookmarkCategory = {
  id: string;
  userId: string;
  name: string;
  createdAt: number;  // server epoch ms
  updatedAt: number;  // server epoch ms
};