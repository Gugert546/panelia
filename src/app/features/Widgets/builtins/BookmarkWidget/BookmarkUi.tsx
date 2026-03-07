import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useBookmark } from "./BookmarkLogic";

export default function BookmarkUi() {

  const { categories, handleAddBookmark, handleAddCategory } = useBookmark();

  return (
    <WidgetContainer>
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
              fontSize: 14
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

            {categories.map((category) => (
              <div key={category.name}>

                <h4
                  style={{
                    margin: "6px 0",
                    fontSize: 14
                  }}
                >
                  {category.name}
                </h4>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    fontSize: 14
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

                <button
                  onClick={() => handleAddBookmark(category.name)}
                  style={{
                    marginTop: 6,
                    fontSize: 14
                  }}
                >
                  Add Bookmark
                </button>

              </div>
            ))}

          </div>

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}