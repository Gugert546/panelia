import { useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useBookmark } from "./BookmarkLogic";
import BookmarkForm from "./BookmarkForm";
import CategoryForm from "./CategoryForm";
import { useFontSize } from "../../../../providers/themeProviders";
import { useLanguage } from "../../../../providers/languageProvider";




export default function BookmarkUi() {
  const {
    categories,
    loading,
    error,
    handleAddCategory,
    handleAddBookmark,
    handleDeleteBookmark,
    getBookmarksByCategory,
  } = useBookmark();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [selectedCategoryForBookmark, setSelectedCategoryForBookmark] = useState<string | null>(null);

  const { fontSize } = useFontSize();
  const { t } = useLanguage(); 

  if (loading) {
    return (
      <WidgetContainer >
        <WidgetPane title={t('widgets.bookmarkWidget.title')}>
          <div style={{ padding: 16, textAlign: "center" }}>{t('widgets.bookmarkWidget.loading')}</div>
        </WidgetPane>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer>
      <WidgetPane title={t('widgets.bookmarkWidget.title')}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 12,
            padding: 8,
          }}
        >
          {error && (
            <div style={{ color: "#dc3545", fontSize: 12, padding: 8, background: "#f8d7da", borderRadius: 4 }}>
              {error}
            </div>
          )}

          {!showCategoryForm ? (
            <button
              onClick={() => setShowCategoryForm(true)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                background: "#007BFF",
                color: "#FFF",
                border: "none",
                cursor: "pointer",
                fontSize,
              }}
            >
              {t('widgets.bookmarkWidget.addCategory')}
            </button>
          ) : (
            <div style={{ background: "#f0f0f0", padding: 8, borderRadius: 4 }}>
              <CategoryForm
                onSubmit={async (name) => {
                  await handleAddCategory(name);
                  setShowCategoryForm(false);
                }}
                isLoading={false}
              />
              <button
                onClick={() => setShowCategoryForm(false)}
                style={{
                  marginTop: 8,
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {t('widgets.bookmarkWidget.cancel')}
              </button>
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {categories.length === 0 ? (
              <div style={{ fontSize, color: "#999", textAlign: "center", padding: 16 }}>
                {t('widgets.bookmarkWidget.noCategories')}
              </div>
            ) : (
              categories.map((category) => {
                const categoryBookmarks = getBookmarksByCategory(category.id);
                const isExpanded = expandedCategory === category.id;

                return (
                  <div key={category.id} style={{ borderLeft: "3px solid #007BFF", paddingLeft: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        gap: 8,
                      }}
                      onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    >
                      <h4
                        style={{
                          margin: "6px 0",
                          fontSize,
                          flex: 1,
                        }}
                      >
                        {category.name} ({categoryBookmarks.length})
                      </h4>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedCategory(category.id);
                          setSelectedCategoryForBookmark(
                            selectedCategoryForBookmark === category.id ? null : category.id
                          );
                        }}
                        title={t('widgets.bookmarkWidget.addBookmark')}
                        aria-label={`${t('widgets.bookmarkWidget.addBookmark')} ${t('widgets.bookmarkWidget.to')} ${category.name}`}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          border: "1px solid #28a745",
                          background: "#fff",
                          color: "#28a745",
                          fontSize: 14,
                          lineHeight: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        +
                      </button>
                      <span style={{ fontSize: 12, color: "#999", marginLeft: "auto" }}>
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 8 }}>
                        {categoryBookmarks.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#999", padding: 8 }}>{t('widgets.bookmarkWidget.noBookmarks')}</div>
                        ) : (
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: 16,
                              fontSize,
                              marginBottom: 8,
                            }}
                          >
                            {categoryBookmarks.map((bookmark) => (
                              <li
                                key={bookmark.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 4,
                                }}
                              >
                                <a
                                  href={bookmark.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    textDecoration: "none",
                                    color: "#007BFF",
                                    flex: 1,
                                  }}
                                >
                                  {bookmark.title}
                                </a>
                                <button
                                  onClick={() => handleDeleteBookmark(bookmark.id)}
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: 10,
                                    background: "#dc3545",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 3,
                                    cursor: "pointer",
                                    marginLeft: 8,
                                  }}
                                >
                                    {t('widgets.bookmarkWidget.delete')}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {selectedCategoryForBookmark === category.id ? (
                          <div style={{ background: "#f0f0f0", padding: 8, borderRadius: 4, marginBottom: 8 }}>
                            <BookmarkForm
                              onSubmit={async (title, url) => {
                                await handleAddBookmark(category.id, title, url);
                                setSelectedCategoryForBookmark(null);
                              }}
                            />
                            <button
                              onClick={() => setSelectedCategoryForBookmark(null)}
                              style={{
                                marginTop: 8,
                                padding: "4px 8px",
                                fontSize: 12,
                                background: "#6c757d",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                                width: "100%",
                              }}
                            >
                              {t('widgets.bookmarkWidget.cancel')}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
