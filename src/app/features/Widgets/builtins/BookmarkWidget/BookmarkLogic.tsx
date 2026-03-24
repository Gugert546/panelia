import { useState, useEffect } from "react";
import { useAuth } from "../../../auth/useAuth";
import {
  subscribeToCategories,
  subscribeToBookmarks,
  createCategory,
  createBookmark,
  deleteBookmark,
  deleteCategory,
} from "../../../../../lib/firebase/firestore";
import type { Bookmark, BookmarkCategory } from "../../../../../types/firestore";

export function useBookmark() {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time updates when user changes
  useEffect(() => {
    // console.log("Current user:", user); // test for å se om user er null eller undefined
    // console.log("User UID:", user?.uid); // test for å se om user.uid er tilgjengelig
    
    if (!user?.uid) {
      setCategories([]);
      setBookmarks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to both categories and bookmarks
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

  // Add a new category
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

  // Add a new bookmark to a category
  const handleAddBookmark = async (
    categoryId: string,
    title: string,
    url: string
  ) => {
    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    try {
      const newBookmark: Bookmark = {
        id: `bookmark_${Date.now()}`,
        userId: user.uid,
        categoryId,
        title,
        url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await createBookmark(user.uid, newBookmark);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add bookmark";
      setError(message);
      console.error("Error adding bookmark:", err);
    }
  };

  // Delete a bookmark
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

  // Delete a category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    try {
      // Delete all bookmarks in this category
      const categoryBookmarks = bookmarks.filter(b => b.categoryId === categoryId);
      await Promise.all(
        categoryBookmarks.map(b => deleteBookmark(user.uid, b.id))
      );
      
      // Then delete the category
      await deleteCategory(user.uid, categoryId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      setError(message);
      console.error("Error deleting category:", err);
    }
  };

  // Get bookmarks for a specific category
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