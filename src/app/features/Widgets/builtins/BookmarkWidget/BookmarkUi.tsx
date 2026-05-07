import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useBookmark } from "./BookmarkLogic";
import BookmarkForm from "./BookmarkForm";
import CategoryForm from "./CategoryForm";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";
import { getFaviconCandidates } from "../../../../../lib/utils/favicon";
import { useWidgets } from "../../../dashboard/hooks/WidgetsContext";
import { useWidgetInstance } from "../../components/WidgetInstanceContext";

type BookmarkIconProps = {
  url: string;
  favicon?: string;
  title: string;
};

function toRgba(color: string, alpha: number) {
  const trimmed = color.trim();
  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i
  );

  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  const hexMatch = trimmed.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1].length === 3
      ? hexMatch[1].split("").map((char) => char + char).join("")
      : hexMatch[1];

    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);

    return `rgba(${red},${green},${blue},${alpha})`;
  }

  return color;
}

function BookmarkIcon({ url, favicon, title }: BookmarkIconProps) {
  const candidates = useMemo(() => getFaviconCandidates(url, favicon), [url, favicon]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [url, favicon, candidates.length]);

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
  const addCategoryBtnRef = useRef<HTMLButtonElement | null>(null);
  const focusAddCategoryBtnAfterClose = useRef(false);
  const addBookmarkBtnRef = useRef<HTMLButtonElement | null>(null);
  const deleteCategoryBtnRef = useRef<HTMLButtonElement | null>(null);
  const deleteCategoryCancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const deleteCategoryConfirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const bookmarkContentRef = useRef<HTMLDivElement | null>(null);
  const focusFirstBookmarkAfterClose = useRef(false);

  const fontSize = useResolvedWidgetFontSize();
  const { t } = useLanguage();
  const { widgetSurfaceColor, widgetBorderColor, widgetTextColor, widgetStyles } = useWidgets();
  const widgetInstance = useWidgetInstance();
  const widgetStyle = widgetInstance ? widgetStyles[widgetInstance.widgetId] : undefined;
  const resolvedSurfaceColor = widgetStyle?.widgetSurfaceColor ?? widgetSurfaceColor;
  const resolvedBorderColor = widgetStyle?.widgetBorderColor ?? widgetBorderColor;
  const resolvedTextColor = widgetStyle?.widgetTextColor ?? widgetTextColor;
  const raisedSurface = toRgba(resolvedSurfaceColor, 0.22);
  const inputSurface = toRgba(resolvedSurfaceColor, 0.42);
  const strongSurface = toRgba(resolvedSurfaceColor, 0.3);
  const editPanelButtonStyle = {
    padding: "8px 12px",
    fontSize: 13,
    background: "rgba(255,255,255,0.54)",
    color: "#0f172a",
    border: "1px solid rgba(20, 26, 41, 0.16)",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42)",
  } as const;

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

  const focusEditWidgetButton = (start: HTMLElement) => {
    const widgetRoot = start.closest("[data-widget-id]");
    if (!(widgetRoot instanceof HTMLElement)) return;

    const styleButton = widgetRoot.querySelector(
      "button.widget-style-btn:not([disabled])"
    ) as HTMLButtonElement | null;

    styleButton?.focus();
  };

  const closeCategoryFormAndRefocus = () => {
    focusAddCategoryBtnAfterClose.current = true;
    setShowCategoryForm(false);
  };

  useEffect(() => {
    if (!showCategoryForm && focusAddCategoryBtnAfterClose.current) {
      focusAddCategoryBtnAfterClose.current = false;
      addCategoryBtnRef.current?.focus();
    }
  }, [showCategoryForm]);

  useEffect(() => {
    if (!selectedCategoryForBookmark && focusFirstBookmarkAfterClose.current) {
      focusFirstBookmarkAfterClose.current = false;

      const firstBookmarkLink = bookmarkContentRef.current?.querySelector(
        "a[data-bookmark-item-link='true']"
      ) as HTMLAnchorElement | null;

      if (firstBookmarkLink) {
        firstBookmarkLink.focus();
        return;
      }

      addBookmarkBtnRef.current?.focus();
    }
  }, [selectedCategoryForBookmark]);

  useEffect(() => {
    if (isDeleteCategoryModalOpen) {
      deleteCategoryCancelBtnRef.current?.focus();
    }
  }, [isDeleteCategoryModalOpen]);

  const closeBookmarkFormAndRefocus = () => {
    focusFirstBookmarkAfterClose.current = true;
    setSelectedCategoryForBookmark(null);
  };

  const handleDeleteCategoryModalKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Escape: close modal and return focus
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setIsDeleteCategoryModalOpen(false);
      requestAnimationFrame(() => {
        deleteCategoryBtnRef.current?.focus();
      });
      return;
    }

    // Tab navigation - cycle between Cancel and Confirm buttons
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) {
        // Shift+Tab: go to Cancel button
        deleteCategoryCancelBtnRef.current?.focus();
      } else {
        // Tab: go to Confirm button if on Cancel, or back to Cancel if on Confirm
        if (event.target === deleteCategoryCancelBtnRef.current) {
          deleteCategoryConfirmBtnRef.current?.focus();
        } else {
          deleteCategoryCancelBtnRef.current?.focus();
        }
      }
      return;
    }

    // Arrow keys: cycle between buttons
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      deleteCategoryCancelBtnRef.current?.focus();
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      deleteCategoryConfirmBtnRef.current?.focus();
      return;
    }

    // Allow Enter to pass through to activate buttons
    // Don't block it - let it activate the focused button naturally
  };

  const handleBookmarkArrowNavigation = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Handle Escape: close category form and go back to the add-category button
    if (event.key === "Escape" && showCategoryForm) {
      event.preventDefault();
      event.stopPropagation();
      closeCategoryFormAndRefocus();
      return;
    }

    if (
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    const target = event.target as HTMLElement;
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

    // For inputs, only handle ArrowUp/Down (let ArrowLeft/Right move the cursor)
    if (isInput && (event.key === "ArrowLeft" || event.key === "ArrowRight")) return;

    const currentControl = isInput
      ? target
      : (target.closest("button:not([disabled]),a[href]") as HTMLElement | null);
    if (!currentControl) return;

    // When the category form is open, restrict navigation to only form elements
    const formContainer = showCategoryForm
      ? event.currentTarget.querySelector<HTMLElement>("[data-bookmark-category-form]")
      : null;
    const searchRoot = formContainer ?? event.currentTarget;

    const controls = Array.from(
      searchRoot.querySelectorAll<HTMLElement>(
        "input:not([disabled]),button:not([disabled]),a[href]"
      )
    ).filter((element) => {
      if (element.closest(".widget-style-control")) return false;
      if (
        element.classList.contains("widget-style-btn") ||
        element.classList.contains("widget-lock-btn") ||
        element.classList.contains("widget-clock-mode-btn") ||
        element.classList.contains("widget-clock-background-btn")
      ) {
        return false;
      }

      return true;
    });

    if (controls.length === 0) return;

    const index = controls.indexOf(currentControl);
    if (index === -1) return;

    const bookmarkLinks = Array.from(
      searchRoot.querySelectorAll<HTMLElement>("a[data-bookmark-item-link='true']")
    );
    const bookmarkIndex = bookmarkLinks.indexOf(currentControl);
    const bookmarkIconLinks = Array.from(
      searchRoot.querySelectorAll<HTMLElement>("a[data-bookmark-item-icon='true']")
    );
    const bookmarkIconIndex = bookmarkIconLinks.indexOf(currentControl);
    const bookmarkDeleteButtons = Array.from(
      searchRoot.querySelectorAll<HTMLElement>("button[data-bookmark-delete-btn='true']")
    );
    const bookmarkDeleteIndex = bookmarkDeleteButtons.indexOf(currentControl);
    const lastBookmarkIcon = bookmarkIconLinks[bookmarkIconLinks.length - 1] ?? null;
    const lastBookmarkLink = bookmarkLinks[bookmarkLinks.length - 1] ?? null;
    const lastBookmarkDeleteButton = bookmarkDeleteButtons[bookmarkDeleteButtons.length - 1] ?? null;
    const firstBookmarkLink = searchRoot.querySelector<HTMLElement>(
      "a[data-bookmark-item-link='true']"
    );
    const firstBookmarkDeleteButton = searchRoot.querySelector<HTMLElement>(
      "button[data-bookmark-delete-btn='true']"
    );

    if (
      deleteCategoryBtnRef.current &&
      (currentControl === lastBookmarkIcon || currentControl === lastBookmarkLink || currentControl === lastBookmarkDeleteButton) &&
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      event.stopPropagation();
      deleteCategoryBtnRef.current.focus();
      return;
    }

    if (currentControl === deleteCategoryBtnRef.current && event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();

      // If there are bookmarks, focus the last bookmark title
      if (lastBookmarkLink) {
        lastBookmarkLink.focus();
      } else {
        // If no bookmarks, focus the category dropdown button
        const categoryButton = categorySelectorRef.current?.querySelector<HTMLButtonElement>(
          ":scope > button"
        );
        categoryButton?.focus();
      }
      return;
    }

    if (bookmarkDeleteIndex !== -1 && event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();

      const row = currentControl.closest("li") ?? currentControl.parentElement;
      const rowLink = row?.querySelector<HTMLElement>("a[data-bookmark-item-link='true']");
      rowLink?.focus();
      return;
    }

    if (bookmarkIconIndex !== -1 && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "ArrowUp") {
        if (bookmarkIconIndex === 0) {
          addBookmarkBtnRef.current?.focus();
          return;
        }
        bookmarkIconLinks[bookmarkIconIndex - 1]?.focus();
        return;
      }

      bookmarkIconLinks[bookmarkIconIndex + 1]?.focus();
      return;
    }

    if (bookmarkIndex !== -1 && event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();

      const row = currentControl.closest("li") ?? currentControl.parentElement;
      const rowIcon = row?.querySelector<HTMLElement>("a[data-bookmark-item-icon='true']");
      rowIcon?.focus();
      return;
    }

    if (
      addBookmarkBtnRef.current &&
      (
        (currentControl === firstBookmarkLink && event.key === "ArrowUp") ||
        (currentControl === firstBookmarkDeleteButton && event.key === "ArrowUp")
      )
    ) {
      event.preventDefault();
      event.stopPropagation();
      addBookmarkBtnRef.current.focus();
      return;
    }

    if (
      currentControl === addBookmarkBtnRef.current &&
      (event.key === "ArrowDown" || event.key === "ArrowRight")
    ) {
      const firstBookmarkLink = bookmarkLinks[0];
      if (firstBookmarkLink) {
        event.preventDefault();
        event.stopPropagation();
        firstBookmarkLink.focus();
        return;
      }
    }

    if (bookmarkIndex !== -1 && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "ArrowUp") {
        bookmarkLinks[bookmarkIndex - 1]?.focus();
        return;
      }

      bookmarkLinks[bookmarkIndex + 1]?.focus();
      return;
    }

    if (bookmarkDeleteIndex !== -1 && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "ArrowUp") {
        bookmarkDeleteButtons[bookmarkDeleteIndex - 1]?.focus();
        return;
      }

      bookmarkDeleteButtons[bookmarkDeleteIndex + 1]?.focus();
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();

      const previous = controls[index - 1];
      if (previous) {
        previous.focus();
        return;
      }

      // If form is open, don't escape upward — stay at top
      if (!showCategoryForm) {
        focusEditWidgetButton(currentControl);
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      controls[index + 1]?.focus();
    }
  };

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

    // Ensure keyboard users land inside the dialog immediately.
    requestAnimationFrame(() => {
      deleteCategoryCancelBtnRef.current?.focus();
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeletingCategory) {
        setIsDeleteCategoryModalOpen(false);
        requestAnimationFrame(() => {
          deleteCategoryBtnRef.current?.focus();
        });
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

      // Calculate how many categories will be left after deletion
      const categoriesBeforeDeletion = categories;
      const willHaveNoCategories =
        categoriesBeforeDeletion.filter((cat) => cat.id !== activeCategory.id).length === 0;

      await handleDeleteCategory(activeCategory.id);
      setSelectedCategoryForBookmark(null);
      setIsCategoryMenuOpen(false);
      setSelectedCategoryId(null);
      setIsDeleteCategoryModalOpen(false);

      requestAnimationFrame(() => {
        if (willHaveNoCategories) {
          addCategoryBtnRef.current?.focus();
        } else {
          deleteCategoryBtnRef.current?.focus();
        }
      });
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
          ref={bookmarkContentRef}
          onKeyDown={handleBookmarkArrowNavigation}
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
              ref={addCategoryBtnRef}
              data-bookmark-add-category-btn="true"
              onClick={() => setShowCategoryForm(true)}
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                background: raisedSurface,
                color: resolvedTextColor,
                border: `1px solid ${resolvedBorderColor}`,
                cursor: "pointer",
                fontSize,
                fontWeight: 500,
              }}
            >
              {t("widgets.bookmarkWidget.addCategory")}
            </button>
          ) : (
            <div
              data-bookmark-category-form
              style={{
                background: raisedSurface,
                padding: 10,
                borderRadius: 12,
                border: `1px solid ${resolvedBorderColor}`,
              }}
            >
              <CategoryForm
                onSubmit={async (name) => {
                  await handleAddCategory(name);
                  closeCategoryFormAndRefocus();
                }}
                isLoading={false}
                textColor={resolvedTextColor}
                surfaceColor={inputSurface}
                borderColor={resolvedBorderColor}
              />
              <button
                onClick={closeCategoryFormAndRefocus}
                style={{
                  ...editPanelButtonStyle,
                  marginTop: 8,
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
                  color: resolvedTextColor,
                  textAlign: "center",
                  padding: 16,
                  background: raisedSurface,
                  borderRadius: 12,
                  border: `1px solid ${resolvedBorderColor}`,
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
                        color: resolvedTextColor,
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
                          background: inputSurface,
                          border: `1px solid ${resolvedBorderColor}`,
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
                                color: resolvedTextColor,
                                background: isSelected
                                  ? strongSurface
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
                    ref={addBookmarkBtnRef}
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
                      border: `1px solid ${resolvedBorderColor}`,
                      borderRadius: 8,
                      background: raisedSurface,
                      color: resolvedTextColor,
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
                      background: raisedSurface,
                      padding: 10,
                      borderRadius: 12,
                      border: `1px solid ${resolvedBorderColor}`,
                      marginTop: 2,
                    }}
                  >
                    <BookmarkForm
                      onSubmit={async (title, url) => {
                        if (!activeCategory) return;
                        await handleAddBookmark(activeCategory.id, title, url);
                        closeBookmarkFormAndRefocus();
                      }}
                      textColor={resolvedTextColor}
                      surfaceColor={inputSurface}
                      borderColor={resolvedBorderColor}
                    />
                    <button
                      onClick={closeBookmarkFormAndRefocus}
                      style={{
                        ...editPanelButtonStyle,
                        marginTop: 8,
                        width: "100%",
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
                      color: resolvedTextColor,
                      padding: 10,
                      borderRadius: 12,
                      background: raisedSurface,
                      border: `1px solid ${resolvedBorderColor}`,
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
                            background: raisedSurface,
                            border: `1px solid ${resolvedBorderColor}`,
                            borderRadius: 10,
                            padding: "8px 10px",
                            color: resolvedTextColor,
                          }}
                        >
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-bookmark-item-icon="true"
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
                            data-bookmark-item-link="true"
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
                            data-bookmark-delete-btn="true"
                            style={{
                              border: `1px solid ${resolvedBorderColor}`,
                              background: strongSurface,
                              color: resolvedTextColor,
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
            ref={deleteCategoryBtnRef}
            onClick={() => setIsDeleteCategoryModalOpen(true)}
            disabled={!activeCategory}
            style={{
              marginTop: 8,
              alignSelf: "flex-end",
              border: `1px solid ${resolvedBorderColor}`,
              borderRadius: 8,
              background: strongSurface,
              color: resolvedTextColor,
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
                    onKeyDown={handleDeleteCategoryModalKeyDown}
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
                        ref={deleteCategoryCancelBtnRef}
                        onClick={() => {
                          setIsDeleteCategoryModalOpen(false);
                          requestAnimationFrame(() => {
                            deleteCategoryBtnRef.current?.focus();
                          });
                        }}
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
                        ref={deleteCategoryConfirmBtnRef}
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
