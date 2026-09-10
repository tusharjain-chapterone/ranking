import { useState } from "react";
import type { ActionFunctionArgs } from "react-router";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";

// Parses a Swatch King "Product groups" export (Group Name, Option Value,
// Swatch Color Code / Image URL). Image URL filenames are the real Shopify
// product handle (verified: cdn.starapps.studio/.../<handle>.media matches
// the store's actual product Handle), so we use that to link each product
// to its design family without needing any extra data from Swatch King.
function parseSwatchGroupCsv(text: string): Map<string, string> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const handleToGroup = new Map<string, string>();
  if (lines.length === 0) return handleToGroup;

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { out.push(field); field = ""; }
        else field += c;
      }
    }
    out.push(field);
    return out;
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const groupName = cols[0]?.trim();
    const urlOrColor = cols[2]?.trim();
    if (!groupName || !urlOrColor || !urlOrColor.startsWith("http")) continue;
    const withoutQuery = urlOrColor.split("?")[0];
    const filename = withoutQuery.split("/").pop() || "";
    const handle = filename.replace(/\.[a-zA-Z0-9]+$/, "");
    if (handle) handleToGroup.set(handle, groupName);
  }
  return handleToGroup;
}

interface CollectionProductRef {
  id: string;
  handle: string;
}

// Round-robin interleave: groups are ordered by the position of their
// best (earliest) member in the current collection order, so the overall
// priority from prior ranking work is preserved. Within each pass, one
// product per group is taken, so page 1 of "View all" samples many
// different designs instead of 15 colors of the same 1-2 designs.
function diversify(
  products: CollectionProductRef[],
  handleToGroup: Map<string, string>,
): { order: CollectionProductRef[]; groupedCount: number; groupCount: number } {
  const groups = new Map<string, CollectionProductRef[]>();
  const groupOrder: string[] = [];
  let groupedCount = 0;

  for (const p of products) {
    const key = handleToGroup.get(p.handle) ?? `__singleton__:${p.handle}`;
    if (handleToGroup.has(p.handle)) groupedCount++;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(p);
  }

  const order: CollectionProductRef[] = [];
  const pointers = new Map(groupOrder.map((k) => [k, 0]));
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const key of groupOrder) {
      const idx = pointers.get(key)!;
      const arr = groups.get(key)!;
      if (idx < arr.length) {
        order.push(arr[idx]);
        pointers.set(key, idx + 1);
        remaining = true;
      }
    }
  }

  return { order, groupedCount, groupCount: groupOrder.length };
}

const FIND_COLLECTION_QUERY = `#graphql
  query FindCollection($query: String!) {
    collections(first: 5, query: $query) {
      nodes { id title sortOrder }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  query CollectionProducts($id: ID!, $cursor: String) {
    collection(id: $id) {
      products(first: 250, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { id handle }
      }
    }
  }
`;

const SET_SORT_ORDER_MUTATION = `#graphql
  mutation SetManualSort($id: ID!) {
    collectionUpdate(input: { id: $id, sortOrder: MANUAL }) {
      userErrors { field message }
    }
  }
`;

const REORDER_MUTATION = `#graphql
  mutation Reorder($id: ID!, $moves: [MoveInput!]!) {
    collectionReorderProducts(id: $id, moves: $moves) {
      job { id }
      userErrors { field message }
    }
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const collectionName = String(formData.get("collectionName") || "").trim();
  const groupCsvText = String(formData.get("groupCsvText") || "");

  if (!collectionName || !groupCsvText) {
    return { ok: false, message: "Collection name and Swatch King group export are required." };
  }

  const handleToGroup = parseSwatchGroupCsv(groupCsvText);
  if (handleToGroup.size === 0) {
    return {
      ok: false,
      message: 'Could not extract any handle-to-group mappings from the pasted CSV. Check it has "Group Name" and an image URL column with real http(s) links.',
    };
  }

  const findRes = await admin.graphql(FIND_COLLECTION_QUERY, {
    variables: { query: `title:'${collectionName.replace(/'/g, "")}'` },
  });
  const findJson: any = await findRes.json();
  const collection = findJson.data?.collections?.nodes?.[0];
  if (!collection) {
    return { ok: false, message: `No collection found matching "${collectionName}".` };
  }

  if (collection.sortOrder !== "MANUAL") {
    const setRes = await admin.graphql(SET_SORT_ORDER_MUTATION, { variables: { id: collection.id } });
    const setJson: any = await setRes.json();
    const errs = setJson.data?.collectionUpdate?.userErrors;
    if (errs?.length) {
      return { ok: false, message: `Could not switch to manual sort: ${errs.map((e: any) => e.message).join(", ")}` };
    }
  }

  const products: CollectionProductRef[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  while (hasNext) {
    const res: Response = await admin.graphql(COLLECTION_PRODUCTS_QUERY, {
      variables: { id: collection.id, cursor },
    });
    const json: any = await res.json();
    const conn = json.data?.collection?.products;
    if (!conn) break;
    for (const node of conn.nodes) products.push({ id: node.id, handle: node.handle });
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }

  if (products.length === 0) {
    return { ok: false, message: `"${collection.title}" has no products to reorder.` };
  }

  const { order, groupedCount, groupCount } = diversify(products, handleToGroup);

  const moves = order.map((p, i) => ({ id: p.id, newPosition: String(i) }));
  const CHUNK_SIZE = 250;
  const mutationErrors: string[] = [];
  for (let i = 0; i < moves.length; i += CHUNK_SIZE) {
    const chunk = moves.slice(i, i + CHUNK_SIZE);
    const res = await admin.graphql(REORDER_MUTATION, { variables: { id: collection.id, moves: chunk } });
    const json: any = await res.json();
    const errs = json.data?.collectionReorderProducts?.userErrors;
    if (errs?.length) mutationErrors.push(...errs.map((e: any) => e.message));
  }

  return {
    ok: true,
    message: `Reordered ${products.length} products in "${collection.title}" for variety. ${groupedCount} products matched a design group (${groupCount} distinct groups + standalone products); the rest were treated as standalone. Page 1 of "View all" now samples different designs before repeating colors of the same design.${
      mutationErrors.length ? " Errors: " + mutationErrors.join("; ") : ""
    }`,
  };
};

export default function DiversifyPage() {
  const fetcher = useFetcher<typeof action>();
  const isBusy = fetcher.state !== "idle";
  const [collectionName, setCollectionName] = useState("Sofa Cover");
  const [groupCsvText, setGroupCsvText] = useState("");

  const submit = () => {
    const fd = new FormData();
    fd.append("collectionName", collectionName);
    fd.append("groupCsvText", groupCsvText);
    fetcher.submit(fd, { method: "POST" });
  };

  return (
    <s-page heading="Diversify Collection Order">
      {fetcher.data && "message" in fetcher.data && (
        <s-banner tone={fetcher.data.ok ? "success" : "critical"} heading={fetcher.data.message} />
      )}

      <s-section heading="Spread out same-design color variants across the collection">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            When many products in a collection are just different colors of the same
            design, the first page of "View all" can end up dominated by 1-2 designs.
            This reorders the whole collection so page 1 samples one product per design
            first, keeping your prior ranking priority as the tiebreaker — no theme
            changes needed. Paste the full Swatch King "Product groups" export below
            (Export button in Swatch King's product groups screen); products not in any
            group are left as their own standalone entries.
          </s-paragraph>
          <s-text-field
            label="Collection name (exact title, e.g. Sofa Cover)"
            value={collectionName}
            onChange={(e: any) => setCollectionName(e.target.value)}
          />
          <s-text-area
            label="Swatch King group export CSV"
            value={groupCsvText}
            onChange={(e: any) => setGroupCsvText(e.target.value)}
            rows={12}
          />
          <s-button disabled={!collectionName || !groupCsvText || isBusy} onClick={submit}>
            {isBusy ? "Reordering…" : "Diversify order"}
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
