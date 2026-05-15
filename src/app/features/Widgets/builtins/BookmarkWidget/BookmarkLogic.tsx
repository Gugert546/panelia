import { useState, useEffect } from "react";
import { useAuth } from "../../../auth/useAuth";
import { getPreferredFavicon, normalizeUrl } from "../../../../../lib/utils/favicon";
import {
  subscribeToCategories,
  subscribeToBookmarks,
  createCategory,
  createBookmark,
  deleteBookmark,
  deleteCategory,
} from "../../../../../lib/firebase/firestore";
import type { Bookmark, BookmarkCategory } from "../../../../../types/firestore";

// Bokmerke-hook: laster bokmerker og kategorier fra Firestore i sanntid.
export function useBookmark() {
  const { user } = useAuth();
  // State for bokmerker, kategorier, og loading/error-status.
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lytter til bokmerker og kategorier i sanntid.
  useEffect(() => {
    if (!user?.uid) {
      setCategories([]);
      setBookmarks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Lytter på både kategorier og bokmerker.
    const unsubscribeCategories = subscribeToCategories(user.uid, (data) => {
      setCategories(data);
      setLoading(false);
    });

    const unsubscribeBookmarks = subscribeToBookmarks(user.uid, (data) => {
      setBookmarks(data);
    });

    return () => {
      unsubscribeCategories();
      unsubscribeBookmarks();
    };
  }, [user?.uid]);

  // Oppretter kategori.
  const handleAddCategory = async (categoryName: string) => {
    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    try {
      const newCategory: BookmarkCategory = {
        id: `category_${Date.now()}`,
        userId: user.uid,
        name: categoryName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createCategory(user.uid, newCategory);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add category";
      setError(message);
      console.error("Error adding category:", err);
    }
  };

  // Rydder URL og finner favicon.
  const handleAddBookmark = async (
    categoryId: string,
    title: string,
    url: string
  ) => {
    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) return;

  let favicon = getPreferredFavicon(normalizedUrl);

  try {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(normalizedUrl)}`);
    if (res.ok) {
      const data = (await res.json()) as { favicon?: string };
      favicon = getPreferredFavicon(normalizedUrl, data.favicon);
    }
  } catch {
    // Bruker fallback-favicon ved feil.
  }

  const newBookmark: Bookmark = {
    id: `bookmark_${Date.now()}`,
    userId: user.uid,
    categoryId,
    title,
    url: normalizedUrl,
    favicon,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await createBookmark(user.uid, newBookmark);
};

  // Sletter bokmerke.
  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    try {
      await deleteBookmark(user.uid, bookmarkId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete bookmark";
      setError(message);
      console.error("Error deleting bookmark:", err);
    }
  };

  // Sletter bokmerker i kategorien før selve kategorien.
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user?.uid) {
      const message = "User not authenticated";
      setError(message);
      throw new Error(message);
    }

    try {
      // Sletter alle bokmerker i kategorien
      const categoryBookmarks = bookmarks.filter(b => b.categoryId === categoryId);
      await Promise.all(
        categoryBookmarks.map(b => deleteBookmark(user.uid, b.id))
      );
      
      // Sletter kategori
      await deleteCategory(user.uid, categoryId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      setError(message);
      console.error("Error deleting category:", err);
      throw err instanceof Error ? err : new Error(message);
    }
  };

  // Henter bokmerker for en kategori.
  const getBookmarksByCategory = (categoryId: string): Bookmark[] => {
    return bookmarks.filter(b => b.categoryId === categoryId);
  };

  return {
    categories,
    bookmarks,
    loading,
    error,
    handleAddCategory,
    handleAddBookmark,
    handleDeleteBookmark,
    handleDeleteCategory,
    getBookmarksByCategory,
  };
}
