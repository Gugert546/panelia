import WidgetPane from "../../components/WidgetPane";
import { useBookmark } from "./BookmarkLogic";

export default function BookmarkUi() {
  const { categories, handleAddBookmark, handleAddCategory } = useBookmark();

  return (
    <WidgetPane title="Bookmarks">
      <button
        onClick={handleAddCategory}
        style={{
          marginBottom: 20,
          padding: "10px 20px",
          borderRadius: 5,
          background: "#007BFF",
          color: "#FFF",
          border: "none",
          cursor: "pointer",
        }}
      >
        Add Category
      </button>
      {categories.map((category) => (
        <div key={category.name} style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "10px 0" }}>{category.name}</h4>
          <ul>
            {category.bookmarks.map((bookmark, index) => (
              <li key={index}>
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                  {bookmark.title}
                </a>
              </li>
            ))}
          </ul>
          <button onClick={() => handleAddBookmark(category.name)}>
            Add Bookmark
          </button>
        </div>
      ))}
    </WidgetPane>
  );
}