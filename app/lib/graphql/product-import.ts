import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

function describeGraphQLError(err: any): string {
  const gqlErrors = err?.graphQLErrors ?? err?.errors ?? err?.response?.errors;
  if (Array.isArray(gqlErrors) && gqlErrors.length) {
    return gqlErrors.map((e: any) => e.message ?? JSON.stringify(e)).join(" | ");
  }
  return err?.message ?? String(err);
}

export interface ImportRow {
  sku: string;
  title: string;
  description: string;
  vendor: string;
  type: string;
  tags: string[];
  price: number;
  compareAtPrice: number;
  weightG: number;
  cost: number;
  collection: string;
  group: string;
  mpn: string;
}

// Columns: SKU, Title, Description, Vendor, Type, Tags, Price, CompareAtPrice, WeightGrams, Cost, Collection, Group, MPN
export function parseImportCsv(text: string): { rows: ImportRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  if (lines.length === 0) return { rows: [], errors: ["Empty CSV"] };

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

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const idx = {
    sku: col("sku"),
    title: col("title"),
    description: col("description"),
    vendor: col("vendor"),
    type: col("type"),
    tags: col("tags"),
    price: col("price"),
    compareAtPrice: col("compareatprice"),
    weightG: col("weightgrams"),
    cost: col("cost"),
    collection: col("collection"),
    group: col("group"),
    mpn: col("mpn"),
  };
  if (idx.sku === -1 || idx.title === -1 || idx.price === -1) {
    errors.push('CSV must have at least "SKU", "Title", and "Price" columns.');
    return { rows: [], errors };
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const sku = cols[idx.sku]?.trim();
    const title = cols[idx.title]?.trim();
    const price = parseFloat(cols[idx.price] ?? "");
    if (!sku || !title || Number.isNaN(price)) {
      errors.push(`Row ${i + 1}: skipped, missing SKU/Title or invalid Price.`);
      continue;
    }
    const compareAt = idx.compareAtPrice >= 0 ? parseFloat(cols[idx.compareAtPrice] || "") : NaN;
    rows.push({
      sku,
      title,
      description: idx.description >= 0 ? (cols[idx.description] ?? "") : "",
      vendor: idx.vendor >= 0 && cols[idx.vendor] ? cols[idx.vendor] : "HOKIPO",
      type: idx.type >= 0 ? (cols[idx.type] ?? "") : "",
      tags: idx.tags >= 0 ? (cols[idx.tags] ?? "").split(",").map((t) => t.trim()).filter(Boolean) : [],
      price,
      compareAtPrice: Number.isNaN(compareAt) ? price : compareAt,
      weightG: idx.weightG >= 0 ? parseFloat(cols[idx.weightG] || "0") || 0 : 0,
      cost: idx.cost >= 0 ? parseFloat(cols[idx.cost] || "0") || 0 : 0,
      collection: idx.collection >= 0 ? (cols[idx.collection] ?? "").trim() : "",
      group: idx.group >= 0 ? (cols[idx.group] ?? "").trim() : "",
      mpn: idx.mpn >= 0 ? (cols[idx.mpn] ?? "").trim() : "",
    });
  }
  return { rows, errors };
}

export async function findLocationIdByName(
  admin: AdminApiContext,
  name: string,
): Promise<{ id: string | null; error?: string }> {
  try {
    const res = await admin.graphql(
      `#graphql
        query FindLocation { locations(first: 20) { nodes { id name } } }
      `,
    );
    const json: any = await res.json();
    const match = json.data?.locations?.nodes?.find((l: any) => l.name.toLowerCase() === name.toLowerCase());
    return { id: match?.id ?? null };
  } catch (err) {
    return { id: null, error: describeGraphQLError(err) };
  }
}

const collectionIdCache = new Map<string, string | null>();
export async function findCollectionIdByTitle(admin: AdminApiContext, title: string): Promise<string | null> {
  if (!title) return null;
  if (collectionIdCache.has(title)) return collectionIdCache.get(title)!;
  try {
    const res = await admin.graphql(
      `#graphql
        query FindCollection($query: String!) {
          collections(first: 5, query: $query) { nodes { id title } }
        }
      `,
      { variables: { query: `title:'${title.replace(/'/g, "")}'` } },
    );
    const json: any = await res.json();
    const id = json.data?.collections?.nodes?.[0]?.id ?? null;
    collectionIdCache.set(title, id);
    return id;
  } catch {
    return null;
  }
}

export async function deleteExistingProductsByTitle(admin: AdminApiContext, title: string): Promise<number> {
  try {
    const res = await admin.graphql(
      `#graphql
        query FindProducts($query: String!) { products(first: 20, query: $query) { nodes { id } } }
      `,
      { variables: { query: `title:'${title.replace(/'/g, "")}'` } },
    );
    const json: any = await res.json();
    const ids: string[] = (json.data?.products?.nodes ?? []).map((n: any) => n.id);
    for (const id of ids) {
      await admin.graphql(
        `#graphql
          mutation DeleteProduct($input: ProductDeleteInput!) {
            productDelete(input: $input) { deletedProductId }
          }
        `,
        { variables: { input: { id } } },
      );
    }
    return ids.length;
  } catch {
    return 0;
  }
}

export async function createImportedProduct(
  admin: AdminApiContext,
  row: ImportRow,
  locationId: string,
): Promise<{ productId: string; variantId: string; errors: string[] }> {
  const errors: string[] = [];
  try {
    const collectionId = await findCollectionIdByTitle(admin, row.collection);
    const createRes = await admin.graphql(
      `#graphql
        mutation CreateProduct($product: ProductCreateInput!) {
          productCreate(product: $product) {
            product { id variants(first: 1) { nodes { id } } }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          product: {
            title: row.title,
            descriptionHtml: row.description ? `<p>${row.description}</p>` : "",
            vendor: row.vendor,
            productType: row.type,
            tags: row.tags,
            status: "ACTIVE",
            seo: { title: row.title, description: (row.description || row.title).slice(0, 155) },
            ...(collectionId ? { collectionsToJoin: [collectionId] } : {}),
          },
        },
      },
    );
    const createJson: any = await createRes.json();
    const createErrs = createJson.data?.productCreate?.userErrors ?? [];
    const productId = createJson.data?.productCreate?.product?.id;
    const variantId = createJson.data?.productCreate?.product?.variants?.nodes?.[0]?.id;
    if (createErrs.length) errors.push(...createErrs.map((e: any) => `create: ${e.message}`));
    if (!productId || !variantId) return { productId: "", variantId: "", errors };

    const updateRes = await admin.graphql(
      `#graphql
        mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          productId,
          variants: [
            {
              id: variantId,
              price: row.price.toFixed(2),
              compareAtPrice: row.compareAtPrice.toFixed(2),
              taxable: false,
              barcode: row.sku,
              inventoryItem: {
                sku: row.sku,
                tracked: true,
                cost: row.cost ? row.cost.toFixed(2) : undefined,
                ...(row.weightG ? { measurement: { weight: { value: row.weightG, unit: "GRAMS" } } } : {}),
              },
              inventoryPolicy: "DENY",
            },
          ],
        },
      },
    );
    const updateJson: any = await updateRes.json();
    const updateErrs = updateJson.data?.productVariantsBulkUpdate?.userErrors ?? [];
    if (updateErrs.length) errors.push(...updateErrs.map((e: any) => `variant update: ${e.message}`));

    try {
      const invRes = await admin.graphql(
        `#graphql
          query VariantInventoryItem($id: ID!) { productVariant(id: $id) { inventoryItem { id } } }
        `,
        { variables: { id: variantId } },
      );
      const invJson: any = await invRes.json();
      const inventoryItemId = invJson.data?.productVariant?.inventoryItem?.id;
      if (inventoryItemId) {
        await admin.graphql(
          `#graphql
            mutation ActivateInventory($inventoryItemId: ID!, $locationId: ID!) {
              inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: 0) {
                userErrors { field message }
              }
            }
          `,
          { variables: { inventoryItemId, locationId } },
        );
      }
    } catch {
      // non-fatal
    }

    return { productId, variantId, errors };
  } catch (err) {
    errors.push(`threw: ${describeGraphQLError(err)}`);
    return { productId: "", variantId: "", errors };
  }
}

export async function uploadAndAttachImage(
  admin: AdminApiContext,
  productId: string,
  variantId: string,
  filename: string,
  mimeType: string,
  fileBytes: Uint8Array,
): Promise<string | null> {
  try {
    const stagedRes = await admin.graphql(
      `#graphql
        mutation StagedUpload($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets { url resourceUrl parameters { name value } }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          input: [{ resource: "PRODUCT_IMAGE", filename, mimeType, httpMethod: "POST", fileSize: String(fileBytes.byteLength) }],
        },
      },
    );
    const stagedJson: any = await stagedRes.json();
    const target = stagedJson.data?.stagedUploadsCreate?.stagedTargets?.[0];
    const stagedErrs = stagedJson.data?.stagedUploadsCreate?.userErrors ?? [];
    if (!target || stagedErrs.length) return stagedErrs.map((e: any) => e.message).join(", ") || "staged upload failed";

    const uploadForm = new FormData();
    for (const p of target.parameters) uploadForm.append(p.name, p.value);
    uploadForm.append("file", new Blob([fileBytes as BlobPart], { type: mimeType }), filename);
    const uploadRes = await fetch(target.url, { method: "POST", body: uploadForm });
    if (!uploadRes.ok) return `upload to storage failed: ${uploadRes.status}`;

    const mediaRes = await admin.graphql(
      `#graphql
        mutation CreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
          productCreateMedia(productId: $productId, media: $media) {
            media { ... on MediaImage { id } }
            mediaUserErrors { field message }
          }
        }
      `,
      { variables: { productId, media: [{ originalSource: target.resourceUrl, mediaContentType: "IMAGE" }] } },
    );
    const mediaJson: any = await mediaRes.json();
    const mediaErrs = mediaJson.data?.productCreateMedia?.mediaUserErrors ?? [];
    const mediaId = mediaJson.data?.productCreateMedia?.media?.[0]?.id;
    if (!mediaId || mediaErrs.length) return mediaErrs.map((e: any) => e.message).join(", ") || "media creation failed";

    let mediaStatus = "";
    for (let attempt = 0; attempt < 15; attempt++) {
      const statusRes = await admin.graphql(
        `#graphql
          query MediaStatus($id: ID!) { node(id: $id) { ... on MediaImage { status } } }
        `,
        { variables: { id: mediaId } },
      );
      const statusJson: any = await statusRes.json();
      mediaStatus = statusJson.data?.node?.status;
      if (mediaStatus === "READY" || mediaStatus === "FAILED") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (mediaStatus !== "READY") return `media never became ready (status: ${mediaStatus || "unknown"})`;

    const assignRes = await admin.graphql(
      `#graphql
        mutation AssignVariantMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
          productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
            productVariants { id image { id url } }
            userErrors { field message }
          }
        }
      `,
      { variables: { productId, variantMedia: [{ variantId, mediaIds: [mediaId] }] } },
    );
    const assignJson: any = await assignRes.json();
    const assignErrs = assignJson.data?.productVariantAppendMedia?.userErrors ?? [];
    if (assignErrs.length) return assignErrs.map((e: any) => e.message).join(", ");
    const updated = assignJson.data?.productVariantAppendMedia?.productVariants?.find((pv: any) => pv.id === variantId);
    if (!updated?.image?.url) return "mutation reported success but variant has no image afterward";

    return null;
  } catch (err) {
    return `threw: ${describeGraphQLError(err)}`;
  }
}

export async function setComplementaryProducts(
  admin: AdminApiContext,
  productId: string,
  complementaryProductIds: string[],
): Promise<string | null> {
  if (complementaryProductIds.length === 0) return null;
  try {
    const res = await admin.graphql(
      `#graphql
        mutation SetComplementary($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) { userErrors { field message } }
        }
      `,
      {
        variables: {
          metafields: [
            {
              ownerId: productId,
              namespace: "shopify--discovery--product_recommendation",
              key: "complementary_products",
              type: "list.product_reference",
              value: JSON.stringify(complementaryProductIds),
            },
          ],
        },
      },
    );
    const json: any = await res.json();
    const errs = json.data?.metafieldsSet?.userErrors ?? [];
    return errs.length ? errs.map((e: any) => e.message).join(", ") : null;
  } catch (err) {
    return `threw: ${describeGraphQLError(err)}`;
  }
}
