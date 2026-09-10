import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

export type ProductRow = {
  id: string;
  title: string;
  status: string;
  tags: string[];
  totalInventory: number;
  variantId: string;
  price: string;
  compareAtPrice: string | null;
};

const PRODUCTS_QUERY = `#graphql
  query OpsAppProducts($query: String, $cursor: String) {
    products(first: 50, after: $cursor, query: $query, sortKey: TITLE) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          status
          tags
          totalInventory
          variants(first: 1) {
            edges {
              node {
                id
                price
                compareAtPrice
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchProducts(
  admin: AdminApiContext,
  { query, cursor }: { query?: string; cursor?: string } = {},
) {
  const response = await admin.graphql(PRODUCTS_QUERY, {
    variables: { query: query || null, cursor: cursor || null },
  });
  const json = await response.json();
  const connection = json.data!.products;

  const rows: ProductRow[] = connection.edges.map(({ node }: any) => {
    const variant = node.variants.edges[0]?.node;
    return {
      id: node.id,
      title: node.title,
      status: node.status,
      tags: node.tags,
      totalInventory: node.totalInventory,
      variantId: variant?.id ?? "",
      price: variant?.price ?? "0.00",
      compareAtPrice: variant?.compareAtPrice ?? null,
    };
  });

  return { rows, pageInfo: connection.pageInfo as { hasNextPage: boolean; endCursor: string | null } };
}

export async function bulkSetStatus(
  admin: AdminApiContext,
  productIds: string[],
  status: "ACTIVE" | "DRAFT" | "ARCHIVED",
) {
  const errors: string[] = [];
  for (const id of productIds) {
    const response = await admin.graphql(
      `#graphql
        mutation OpsAppSetStatus($input: ProductUpdateInput!) {
          productUpdate(product: $input) {
            userErrors { field message }
          }
        }
      `,
      { variables: { input: { id, status } } },
    );
    const json = await response.json();
    const userErrors = json.data?.productUpdate?.userErrors ?? [];
    if (userErrors.length) errors.push(`${id}: ${userErrors.map((e: any) => e.message).join(", ")}`);
  }
  return errors;
}

export async function bulkAddTag(
  admin: AdminApiContext,
  productIds: string[],
  tag: string,
) {
  const errors: string[] = [];
  for (const id of productIds) {
    const response = await admin.graphql(
      `#graphql
        mutation OpsAppAddTag($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            userErrors { field message }
          }
        }
      `,
      { variables: { id, tags: [tag] } },
    );
    const json = await response.json();
    const userErrors = json.data?.tagsAdd?.userErrors ?? [];
    if (userErrors.length) errors.push(`${id}: ${userErrors.map((e: any) => e.message).join(", ")}`);
  }
  return errors;
}

export async function bulkAdjustPrice(
  admin: AdminApiContext,
  items: { productId: string; variantId: string; currentPrice: string }[],
  mode: "set" | "percent",
  value: number,
) {
  const errors: string[] = [];
  for (const item of items) {
    const newPrice =
      mode === "set"
        ? value
        : Number(item.currentPrice) * (1 + value / 100);

    const response = await admin.graphql(
      `#graphql
        mutation OpsAppAdjustPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          productId: item.productId,
          variants: [{ id: item.variantId, price: newPrice.toFixed(2) }],
        },
      },
    );
    const json = await response.json();
    const userErrors = json.data?.productVariantsBulkUpdate?.userErrors ?? [];
    if (userErrors.length) errors.push(`${item.productId}: ${userErrors.map((e: any) => e.message).join(", ")}`);
  }
  return errors;
}
