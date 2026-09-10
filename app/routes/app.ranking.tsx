import { useState } from "react";
import type { ActionFunctionArgs } from "react-router";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";

interface RankRow {
  sku: string;
  rank: number;
}

function parseRankingCsv(text: string): RankRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: RankRow[] = [];
  // header: Collection Page,MSKU,SKU CODE,Rank
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 4) continue;
    const sku = cols[2]?.trim();
    const rank = parseInt(cols[3]?.trim(), 10);
    if (!sku || Number.isNaN(rank)) continue;
    rows.push({ sku, rank });
  }
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    if (seen.has(r.sku)) return false;
    seen.add(r.sku);
    return true;
  });
  deduped.sort((a, b) => a.rank - b.rank);
  return deduped;
}

const FIND_COLLECTION_QUERY = `#graphql
  query FindCollection($query: String!) {
    collections(first: 5, query: $query) {
      nodes { id title handle sortOrder }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  query CollectionProducts($id: ID!, $cursor: String) {
    collection(id: $id) {
      id
      title
      sortOrder
      products(first: 250, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          variants(first: 50) {
            nodes { sku }
          }
        }
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
  const csvText = String(formData.get("csvText") || "");

  if (!collectionName || !csvText) {
    return { ok: false, message: "Collection name and CSV data are required." };
  }

  const rankRows = parseRankingCsv(csvText);
  if (rankRows.length === 0) {
    return { ok: false, message: "Could not parse any valid rows from the pasted CSV." };
  }

  const findRes = await admin.graphql(FIND_COLLECTION_QUERY, {
    variables: { query: `title:'${collectionName.replace(/'/g, "")}'` },
  });
  const findJson = await findRes.json();
  const collection = findJson.data?.collections?.nodes?.[0];
  if (!collection) {
    return { ok: false, message: `No collection found matching "${collectionName}".` };
  }

  if (collection.sortOrder !== "MANUAL") {
    const setRes = await admin.graphql(SET_SORT_ORDER_MUTATION, {
      variables: { id: collection.id },
    });
    const setJson = await setRes.json();
    const errs = setJson.data?.collectionUpdate?.userErrors;
    if (errs?.length) {
      return { ok: false, message: `Could not switch to manual sort: ${errs.map((e: any) => e.message).join(", ")}` };
    }
  }

  const skuToProductId = new Map<string, string>();
  let cursor: string | null = null;
  let hasNext = true;
  let totalProducts = 0;
  while (hasNext) {
    const res: Response = await admin.graphql(COLLECTION_PRODUCTS_QUERY, {
      variables: { id: collection.id, cursor },
    });
    const json: any = await res.json();
    const conn: any = json.data?.collection?.products;
    if (!conn) break;
    totalProducts += conn.nodes.length;
    for (const product of conn.nodes) {
      for (const variant of product.variants.nodes) {
        if (variant.sku) skuToProductId.set(variant.sku, product.id);
      }
    }
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }

  const moves: { id: string; newPosition: string }[] = [];
  const notFound: string[] = [];
  let position = 0;
  const seenProductIds = new Set<string>();
  for (const row of rankRows) {
    const productId = skuToProductId.get(row.sku);
    if (!productId) {
      notFound.push(row.sku);
      continue;
    }
    if (seenProductIds.has(productId)) continue;
    seenProductIds.add(productId);
    moves.push({ id: productId, newPosition: String(position) });
    position++;
  }

  if (moves.length === 0) {
    return {
      ok: false,
      message: `None of the ${rankRows.length} SKUs from the sheet matched a product in "${collection.title}" (${totalProducts} products in collection). Nothing was changed.`,
    };
  }

  const CHUNK_SIZE = 250;
  const mutationErrors: string[] = [];
  for (let i = 0; i < moves.length; i += CHUNK_SIZE) {
    const chunk = moves.slice(i, i + CHUNK_SIZE);
    const res = await admin.graphql(REORDER_MUTATION, {
      variables: { id: collection.id, moves: chunk },
    });
    const json = await res.json();
    const errs = json.data?.collectionReorderProducts?.userErrors;
    if (errs?.length) mutationErrors.push(...errs.map((e: any) => e.message));
  }

  const summary = `Reordered ${moves.length} of ${rankRows.length} SKUs in "${collection.title}" (${totalProducts} products in collection). ${notFound.length} SKUs not found${notFound.length ? " (e.g. " + notFound.slice(0, 8).join(", ") + ")" : ""}.${mutationErrors.length ? " Errors: " + mutationErrors.join("; ") : ""}`;

  return { ok: true, message: summary };
};

export default function RankingPage() {
  const fetcher = useFetcher<typeof action>();
  const isBusy = fetcher.state !== "idle";
  const [collectionName, setCollectionName] = useState("");
  const [csvText, setCsvText] = useState("");

  const submit = () => {
    const fd = new FormData();
    fd.append("collectionName", collectionName);
    fd.append("csvText", csvText);
    fetcher.submit(fd, { method: "POST" });
  };

  return (
    <s-page heading="Collection Ranking">
      {fetcher.data && "message" in fetcher.data && (
        <s-banner tone={fetcher.data.ok ? "success" : "critical"} heading={fetcher.data.message} />
      )}

      <s-section heading="Apply a ranking sheet to a collection">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Paste a ranking CSV (columns: Collection Page, MSKU, SKU CODE, Rank). Products
            already in the collection are matched by SKU and reordered — nothing new is
            created.
          </s-paragraph>
          <s-text-field
            label="Collection name (exact title, e.g. Sofa Cover)"
            value={collectionName}
            onChange={(e: any) => setCollectionName(e.target.value)}
          />
          <s-text-area
            label="Ranking CSV content"
            value={csvText}
            onChange={(e: any) => setCsvText(e.target.value)}
            rows={12}
          />
          <s-button disabled={!collectionName || !csvText || isBusy} onClick={submit}>
            {isBusy ? "Applying…" : "Apply ranking"}
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
