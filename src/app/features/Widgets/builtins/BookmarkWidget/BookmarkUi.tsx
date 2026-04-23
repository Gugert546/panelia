import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useBookmark } from "./BookmarkLogic";
import BookmarkForm from "./BookmarkForm";
import CategoryForm from "./CategoryForm";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";
import { getFaviconCandidates } from "../../../../../lib/utils/favicon";

export default function BookmarkUi() {
  const {
    categories,
    loading,
    error,
    handleAddCategory,
    handleAddBookmark,
    handleDeleteBookmark,
    handleDeleteCategory,
    getBookmarksByCategory,
  } = useBookmark();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [selectedCategoryForBookmark, setSelectedCategoryForBookmark] = useState<string | null>(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const categorySelectorRef = useRef<HTMLDivElement | null>(null);

  const fontSize = useResolvedWidgetFontSize();
  const { t } = useLanguage();

  const activeCategory = useMemo(() => {
    if (categories.length === 0) return null;
    return categories.find((category) => category.id === selectedCategoryId) ?? categories[0];
  }, [categories, selectedCategoryId]);

  const activeCategoryBookmarks = useMemo(() => {
    if (!activeCategory) return [];
    return getBookmarksByCategory(activeCategory.id);
  }, [activeCategory, getBookmarksByCategory]);

  const changeCategoryByOffset = (offset: number) => {
    if (!activeCategory || categories.length <= 1) return;

    const currentIndex = categories.findIndex((item) => item.id === activeCategory.id);
    const nextIndex = (currentIndex + offset + categories.length) % categories.length;

    setSelectedCategoryId(categories[nextIndex].id);
    setSelectedCategoryForBookmark(null);
  };

    function BookmarkIcon({ url, favicon, title }: { url: string; favicon?: string; title: string }) {
    const candidates = useMemo(() => getFaviconCandidates(url, favicon), [url, favicon]);
    const [index, setIndex] = useState(0);
    useEffect(() => setIndex(0), [url, favicon, candidates.length]);
    const current = candidates[index] ?? "";
  
    if (current) {
      return (
        <img
          src={current}
          alt=""
          onError={() => setIndex((prev) => Math.min(prev + 1, candidates.length - 1))}
          style={{ width: 18, height: 18, objectFit: "contain" }}
        />
      );
    }
  
    return <span>{title.slice(0, 1).toUpperCase()}</span>;
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!categorySelectorRef.current?.contains(target)) {
        setIsCategoryMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (categories.length === 0) {
      setIsCategoryMenuOpen(false);
      setSelectedCategoryForBookmark(null);
      setIsDeleteCategoryModalOpen(false);
    }
  }, [categories.length]);

  useEffect(() => {
    if (!isDeleteCategoryModalOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeletingCategory) {
        setIsDeleteCategoryModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDeleteCategoryModalOpen, isDeletingCategory]);

  const confirmDeleteCategory = async () => {
    if (!activeCategory) return;

    try {
      setIsDeletingCategory(true);
      await handleDeleteCategory(activeCategory.id);
      setSelectedCategoryForBookmark(null);
      setIsCategoryMenuOpen(false);
      setSelectedCategoryId(null);
      setIsDeleteCategoryModalOpen(false);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  if (loading) {
    return (
      <WidgetContainer>
        <WidgetPane title={t("widgets.bookmarkWidget.title")}>
          <div style={{ padding: 16, textAlign: "center" }}>{t("widgets.bookmarkWidget.loading")}</div>
        </WidgetPane>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer>
      <WidgetPane title={t("widgets.bookmarkWidget.title")}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 10,
            padding: 6,
          }}
        >
          {error && (
            <div
              style={{
                color: "inherit",
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 10,
                background: "rgba(255, 200, 200, 0.65)",
              }}
            >
              {error}
            </div>
          )}

          {!showCategoryForm ? (
            <button
              onClick={() => setShowCategoryForm(true)}
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.18)",
                color: "inherit",
                border: "none",
                cursor: "pointer",
                fontSize,
                fontWeight: 500,
              }}
            >
              {t("widgets.bookmarkWidget.addCategory")}
            </button>
          ) : (
            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                padding: 10,
                borderRadius: 12,
              }}
            >
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
                  background: "rgba(17, 24, 39, 0.18)",
                  color: "inherit",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {t("widgets.bookmarkWidget.cancel")}
              </button>
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {categories.length === 0 ? (
              <div
                style={{
                  fontSize,
                  color: "inherit",
                  textAlign: "center",
                  padding: 16,
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 12,
                }}
              >
                {t("widgets.bookmarkWidget.noCategories")}
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    paddingLeft: 2,
                    color: "inherit",
                    fontSize: Math.max(12, fontSize - 1),
                    fontWeight: 500,
                  }}
                >
                  <span style={{ opacity: 0.75 }}>{t("widgets.bookmarkWidget.Categori")}:</span>
                  <div
                    ref={categorySelectorRef}
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <button
                      onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                      onWheel={(event) => {
                        if (categories.length <= 1) return;
                        event.preventDefault();
                        if (event.deltaY > 0) changeCategoryByOffset(1);
                        if (event.deltaY < 0) changeCategoryByOffset(-1);
                      }}
                      title={categories.length > 1 ? t("widgets.bookmarkWidget.categoryHover") : t("widgets.bookmarkWidget.categori")}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: 0,
                        cursor: categories.length > 1 ? "pointer" : "default",
                        fontSize,
                        fontWeight: 500,
                      }}
                    >
                      <span>{activeCategory?.name ?? "-"}</span>
                      <span style={{ fontSize: 10, transform: "translateY(1px)", opacity: 0.85 }}>
                        {isCategoryMenuOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {isCategoryMenuOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          left: 0,
                          minWidth: 150,
                          maxHeight: 180,
                          overflowY: "auto",
                          borderRadius: 10,
                          background: "rgba(255, 255, 255, 0.97)",
                          border: "1px solid rgba(17,24,39,0.14)",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                          padding: 6,
                          zIndex: 20,
                        }}
                      >
                        {categories.map((category) => {
                          const isSelected = category.id === activeCategory?.id;

                          return (
                            <button
                              key={category.id}
                              onClick={() => {
                                setSelectedCategoryId(category.id);
                                setSelectedCategoryForBookmark(null);
                                setIsCategoryMenuOpen(false);
                              }}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                border: "none",
                                borderRadius: 8,
                                padding: "7px 8px",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: isSelected ? 600 : 500,
                                color: "inherit",
                                background: isSelected
                                  ? "rgba(59,130,246,0.20)"
                                  : "transparent",
                              }}
                            >
                              {category.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      if (!activeCategory) return;
                      setSelectedCategoryForBookmark(
                        selectedCategoryForBookmark === activeCategory.id ? null : activeCategory.id
                      );
                    }}
                    title={t("widgets.bookmarkWidget.addBookmark")}
                    aria-label={
                      activeCategory
                        ? `${t("widgets.bookmarkWidget.addBookmark")} ${t("widgets.bookmarkWidget.to")} ${activeCategory.name}`
                        : t("widgets.bookmarkWidget.addBookmark")
                    }
                    style={{
                      border: "none",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.22)",
                      color: "inherit",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 8px",
                      cursor: activeCategory ? "pointer" : "not-allowed",
                      opacity: activeCategory ? 1 : 0.65,
                    }}
                  >
                    + {t("widgets.bookmarkWidget.addBookmark")}
                  </button>
                </div>

                {selectedCategoryForBookmark === activeCategory?.id ? (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      padding: 10,
                      borderRadius: 12,
                      marginTop: 2,
                    }}
                  >
                    <BookmarkForm
                      onSubmit={async (title, url) => {
                        if (!activeCategory) return;
                        await handleAddBookmark(activeCategory.id, title, url);
                        setSelectedCategoryForBookmark(null);
                      }}
                    />
                    <button
                      onClick={() => setSelectedCategoryForBookmark(null)}
                      style={{
                        marginTop: 8,
                        padding: "6px 8px",
                        fontSize: 12,
                        background: "rgba(17,24,39,0.16)",
                        color: "inherit",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        width: "100%",
                        fontWeight: 500,
                      }}
                    >
                      {t("widgets.bookmarkWidget.cancel")}
                    </button>
                  </div>
                ) : null}

                {activeCategoryBookmarks.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "inherit",
                      padding: 10,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.22)",
                      textAlign: "center",
                    }}
                  >
                    {t("widgets.bookmarkWidget.noBookmarks")}
                  </div>
                ) : (
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {activeCategoryBookmarks.map((bookmark) => (
                      <li key={bookmark.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.18) 100%)",
                            border: "1px solid rgba(255,255,255,0.28)",
                            borderRadius: 10,
                            padding: "8px 10px",
                            color:"inherit",
                          }}
                        >
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              //border: "1px solid rgba(17,24,39,0.28)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "inherit",
                              textDecoration: "none",
                              flexShrink: 0,
                              fontSize: 16,
                            }}
                            aria-label={bookmark.title}
                          >
                            <BookmarkIcon url={bookmark.url} favicon={bookmark.favicon} title={bookmark.title} />
                          </a>

                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              textDecoration: "none",
                              color: "inherit",
                              fontSize,
                              fontWeight: 500,
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {bookmark.title}
                          </a>

                          <button
                            onClick={() => handleDeleteBookmark(bookmark.id)}
                            style={{
                              border: "none",
                              background: "rgba(17,24,39,0.16)",
                              color: "inherit",
                              borderRadius: 7,
                              padding: "3px 8px",
                              fontSize: 11,
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            {t("widgets.bookmarkWidget.delete")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => setIsDeleteCategoryModalOpen(true)}
            disabled={!activeCategory}
            style={{
              marginTop: 8,
              alignSelf: "flex-end",
              border: "none",
              borderRadius: 8,
              background: "rgba(17,24,39,0.16)",
              color: "inherit",
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 500,
              cursor: activeCategory ? "pointer" : "not-allowed",
              opacity: activeCategory ? 1 : 0.6,
            }}
          >
            {t("widgets.bookmarkWidget.deleteCategory")}
          </button>

          {isDeleteCategoryModalOpen && activeCategory && typeof document !== "undefined"
            ? createPortal(
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-category-title"
                  aria-describedby="delete-category-description"
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(10, 15, 25, 0.22)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    display: "grid",
                    placeItems: "center",
                    zIndex: 999999,
                    padding: 16,
                  }}
                  onClick={() => {
                    if (!isDeletingCategory) {
                      setIsDeleteCategoryModalOpen(false);
                    }
                  }}
                >
                  <div
                    style={{
                      width: 340,
                      maxWidth: "100%",
                      borderRadius: 16,
                      padding: 16,
                      background: "rgba(255,255,255,0.94)",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 10px 28px rgba(0,0,0,0.2)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      color: "#0b1320",
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h3 id="delete-category-title" style={{ margin: 0, fontSize: 18 }}>
                      {t("widgets.bookmarkWidget.deleteCategoryTitle")}
                    </h3>

                    <p
                      id="delete-category-description"
                      style={{
                        margin: 0,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "rgba(11, 19, 32, 0.82)",
                      }}
                    >
                      {t("widgets.bookmarkWidget.deleteCategoryConfirm")} <strong>{activeCategory.name}</strong>?{" "}
                      {t("widgets.bookmarkWidget.deleteCategoryWarning")}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => setIsDeleteCategoryModalOpen(false)}
                        disabled={isDeletingCategory}
                        style={{
                          border: "none",
                          borderRadius: 8,
                          background: "rgba(17,24,39,0.12)",
                          color: "#0b1320",
                          padding: "7px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isDeletingCategory ? "not-allowed" : "pointer",
                          opacity: isDeletingCategory ? 0.6 : 1,
                        }}
                      >
                        {t("widgets.bookmarkWidget.cancel")}
                      </button>

                      <button
                        onClick={confirmDeleteCategory}
                        disabled={isDeletingCategory}
                        style={{
                          border: "none",
                          borderRadius: 8,
                          background: "#b91c1c",
                          color: "#ffffff",
                          padding: "7px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isDeletingCategory ? "not-allowed" : "pointer",
                          opacity: isDeletingCategory ? 0.7 : 1,
                        }}
                      >
                        {isDeletingCategory
                          ? t("widgets.bookmarkWidget.deletingCategory")
                          : t("widgets.bookmarkWidget.confirmDeleteCategory")}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )
            : null}
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
