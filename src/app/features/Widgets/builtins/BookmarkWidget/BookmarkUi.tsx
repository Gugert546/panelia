import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useBookmark } from "./BookmarkLogic";

type WidgetSize = "small" | "medium" | "large" | "wide";

type Props = {
  size: WidgetSize;
};

export default function BookmarkUi({ size }: Props) {
  const { categories, handleAddBookmark, handleAddCategory } = useBookmark();

  const fontSize =
    size === "small" ? 12 :
    size === "medium" ? 14 :
    16;

  const maxCategories =
    size === "small" ? 1 :
    size === "medium" ? 2 :
    4;

  return (
    <WidgetContainer size={size}>
      <WidgetPane title="Bookmarks">

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 8
          }}
        >

          <button
            onClick={handleAddCategory}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              background: "#007BFF",
              color: "#FFF",
              border: "none",
              cursor: "pointer",
              fontSize
            }}
          >
            Add Category
          </button>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}
          >
            {categories.slice(0, maxCategories).map((category) => (
              <div key={category.name}>
                <h4
                  style={{
                    margin: "6px 0",
                    fontSize
                  }}
                >
                  {category.name}
                </h4>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    fontSize
                  }}
                >
                  {category.bookmarks.slice(0, 5).map((bookmark, index) => (
                    <li key={index}>
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: "none"
                        }}
                      >
                        {bookmark.title}
                      </a>
                    </li>
                  ))}
                </ul>

                {size !== "small" && (
                  <button
                    onClick={() => handleAddBookmark(category.name)}
                    style={{
                      marginTop: 6,
                      fontSize
                    }}
                  >
                    Add Bookmark
                  </button>
                )}
              </div>
            ))}
          </div>

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}