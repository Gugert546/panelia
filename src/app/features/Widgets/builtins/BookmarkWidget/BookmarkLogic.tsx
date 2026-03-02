import { useState } from "react";

export type Bookmark = {
  title: string;
  url: string;
};

export type Category = {
  name: string;
  bookmarks: Bookmark[];
};

export function useBookmark() {
  const [categories, setCategories] = useState<Category[]>([
    {
      name: "Favorites",
      bookmarks: [
        { title: "Google", url: "https://www.google.com" },
        { title: "GitHub", url: "https://github.com" },
      ],
    },
  ]);

  const handleAddBookmark = (categoryName: string) => {
    const newBookmark: Bookmark = {
      title: prompt("Enter bookmark title:") || "Untitled",
      url: prompt("Enter bookmark URL:") || "#",
    };

    setCategories((prevCategories) =>
      prevCategories.map((category) =>
        category.name === categoryName
          ? {
              ...category,
              bookmarks: [...category.bookmarks, newBookmark],
            }
          : category
      )
    );
  };
  const handleAddCategory = () => {
    const newCategoryName = prompt("Enter category name:");
    if (newCategoryName) {
      setCategories((prevCategories) => [
        ...prevCategories,
        { name: newCategoryName, bookmarks: [] },
      ]);
    }
  };

  return { categories, handleAddBookmark, handleAddCategory };
}