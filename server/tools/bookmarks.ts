
import type { ToolDef } from "./types";

type MakeBookmarkArgs = {
  url: string;
  title: string;
  category?: string; // default "Favorites"
};

type MakeBookmarkResult = {
  ok: true;
  bookmarkId: string;
  category: string;
  title: string;
  url: string;
};

export const makeBookmarkTool: ToolDef<MakeBookmarkArgs, MakeBookmarkResult> = {
  name: "makeBookmark",
  description:
    "Create a bookmark for the current user. Optionally set title and category.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to bookmark" },
      title: { type: "string", description: "title for the bookmark" },
      category: { type: "string", description: "Optional category name" },
    },
    required: ["url"],
    additionalProperties: false,
  },
  async handler(args, ctx) {
    console.log("makeBookmarkTool called with args:", args, "ctx:", ctx);
    // 1) Validate/sanitize
    const category = (args.category?.trim() || "Favorites").slice(0, 40);
    const url = args.url.trim();

    // Basic safety: only allow http(s)
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("Invalid url: must start with http:// or https://");
    }

    const title = (args.title?.trim() || url).slice(0, 120);

    // 2) Write to DB (example structure)
    // bookmarks/{uid}/items/{bookmarkId}
    // categories could be a field, or separate collection.
    const bookmarkId = crypto.randomUUID();

    // TODO: replace with your Firestore client:
    // await firestore.doc(`bookmarks/${ctx.uid}/items/${bookmarkId}`).set({
    //   title, url, category, createdAt: Date.now()
    // });

    return { ok: true, bookmarkId, category, title, url };
  },
};