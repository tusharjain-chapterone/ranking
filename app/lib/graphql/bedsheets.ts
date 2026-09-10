import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { BedsheetProduct } from "../data/bedsheets";

function describeGraphQLError(err: any): string {
  const gqlErrors = err?.graphQLErrors ?? err?.errors ?? err?.response?.errors;
  if (Array.isArray(gqlErrors) && gqlErrors.length) {
    return gqlErrors.map((e: any) => e.message ?? JSON.stringify(e)).join(" | ");
  }
  return err?.message ?? String(err);
}

export async function findLocationIdByName(
  admin: AdminApiContext,
  name: string,
): Promise<{ id: string | null; error?: string }> {
  try {
    const res = await admin.graphql(
      `#graphql
        query FindLocation {
          locations(first: 20) {
            nodes { id name }
          }
        }
      `,
    );
    const json: any = await res.json();
    const match = json.data?.locations?.nodes?.find(
      (l: any) => l.name.toLowerCase() === name.toLowerCase(),
    );
    return { id: match?.id ?? null };
  } catch (err) {
    return { id: null, error: describeGraphQLError(err) };
  }
}

export async function findCollectionIdByTitle(admin: AdminApiContext, title: string): Promise<string | null> {
  try {
    const res = await admin.graphql(
      `#graphql
        query FindCollection($query: String!) {
          collections(first: 5, query: $query) {
            nodes { id title }
          }
        }
      `,
      { variables: { query: `title:'${title.replace(/'/g, "")}'` } },
    );
    const json: any = await res.json();
    return json.data?.collections?.nodes?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function createBedsheetProduct(
  admin: AdminApiContext,
  def: BedsheetProduct,
  locationId: string,
  collectionId: string | null,
): Promise<{ productId: string; variantIdBySku: Map<string, string>; errors: string[] }> {
  const errors: string[] = [];
  try {
    return await createBedsheetProductInner(admin, def, locationId, collectionId, errors);
  } catch (err) {
    errors.push(`threw: ${describeGraphQLError(err)}`);
    return { productId: "", variantIdBySku: new Map(), errors };
  }
}

async function createBedsheetProductInner(
  admin: AdminApiContext,
  def: BedsheetProduct,
  locationId: string,
  collectionId: string | null,
  errors: string[],
): Promise<{ productId: string; variantIdBySku: Map<string, string>; errors: string[] }> {
  const description = `${def.intro} ${def.body2}`;
  const tags = ["Bedsheet", "King Size Bedsheet", "Bedsheets", "Cotton Bedsheet", "New Launch"];

  const createRes = await admin.graphql(
    `#graphql
      mutation CreateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product { id }
          userErrors { field message }
        }
      }
    `,
    {
      variables: {
        product: {
          title: def.title,
          descriptionHtml: `<p>${description}</p>`,
          vendor: "HOKIPO",
          productType: "Bedsheet",
          tags,
          status: "ACTIVE",
          handle: def.handle,
          seo: { title: def.title, description: description.slice(0, 155) },
          ...(collectionId ? { collectionsToJoin: [collectionId] } : {}),
        },
      },
    },
  );
  const createJson: any = await createRes.json();
  const createErrs = createJson.data?.productCreate?.userErrors ?? [];
  const productId = createJson.data?.productCreate?.product?.id;
  if (createErrs.length) {
    // Retry without the metafield if it was the problem (common: metaobject reference format mismatch)
    errors.push(...createErrs.map((e: any) => `create: ${e.message}`));
  }
  if (!productId) {
    return { productId: "", variantIdBySku: new Map(), errors };
  }

  const variantsInput = def.variants.map((v) => ({
    price: def.price.toFixed(2),
    compareAtPrice: def.price.toFixed(2),
    barcode: v.sku,
    optionValues: [{ optionName: "Color", name: v.color }],
    inventoryItem: {
      sku: v.sku,
      tracked: true,
      cost: def.vendorCost.toFixed(2),
      measurement: { weight: { value: def.weightG, unit: "GRAMS" } },
    },
    inventoryPolicy: "DENY",
    inventoryQuantities: [{ locationId, name: "available", quantity: 0 }],
  }));

  const variantsRes = await admin.graphql(
    `#graphql
      mutation CreateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(
          productId: $productId
          variants: $variants
          strategy: REMOVE_STANDALONE_VARIANT
        ) {
          productVariants { id sku }
          userErrors { field message }
        }
      }
    `,
    { variables: { productId, variants: variantsInput } },
  );
  const variantsJson: any = await variantsRes.json();
  const variantErrs = variantsJson.data?.productVariantsBulkCreate?.userErrors ?? [];
  if (variantErrs.length) errors.push(...variantErrs.map((e: any) => `variants: ${e.message}`));

  const variantIdBySku = new Map<string, string>();
  for (const pv of variantsJson.data?.productVariantsBulkCreate?.productVariants ?? []) {
    if (pv.sku) variantIdBySku.set(pv.sku, pv.id);
  }

  return { productId, variantIdBySku, errors };
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
    return await uploadAndAttachImageInner(admin, productId, variantId, filename, mimeType, fileBytes);
  } catch (err) {
    return `threw: ${describeGraphQLError(err)}`;
  }
}

async function uploadAndAttachImageInner(
  admin: AdminApiContext,
  productId: string,
  variantId: string,
  filename: string,
  mimeType: string,
  fileBytes: Uint8Array,
): Promise<string | null> {
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
        input: [
          {
            resource: "PRODUCT_IMAGE",
            filename,
            mimeType,
            httpMethod: "POST",
            fileSize: String(fileBytes.byteLength),
          },
        ],
      },
    },
  );
  const stagedJson: any = await stagedRes.json();
  const target = stagedJson.data?.stagedUploadsCreate?.stagedTargets?.[0];
  const stagedErrs = stagedJson.data?.stagedUploadsCreate?.userErrors ?? [];
  if (!target || stagedErrs.length) {
    return stagedErrs.map((e: any) => e.message).join(", ") || "staged upload failed";
  }

  const uploadForm = new FormData();
  for (const p of target.parameters) uploadForm.append(p.name, p.value);
  uploadForm.append("file", new Blob([fileBytes as BlobPart], { type: mimeType }), filename);

  const uploadRes = await fetch(target.url, { method: "POST", body: uploadForm });
  if (!uploadRes.ok) {
    return `upload to storage failed: ${uploadRes.status}`;
  }

  const mediaRes = await admin.graphql(
    `#graphql
      mutation CreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { ... on MediaImage { id } }
          mediaUserErrors { field message }
        }
      }
    `,
    {
      variables: {
        productId,
        media: [{ originalSource: target.resourceUrl, mediaContentType: "IMAGE" }],
      },
    },
  );
  const mediaJson: any = await mediaRes.json();
  const mediaErrs = mediaJson.data?.productCreateMedia?.mediaUserErrors ?? [];
  const mediaId = mediaJson.data?.productCreateMedia?.media?.[0]?.id;
  if (!mediaId || mediaErrs.length) {
    return mediaErrs.map((e: any) => e.message).join(", ") || "media creation failed";
  }

  const assignRes = await admin.graphql(
    `#graphql
      mutation AssignVariantMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
        productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
          userErrors { field message }
        }
      }
    `,
    { variables: { productId, variantMedia: [{ variantId, mediaIds: [mediaId] }] } },
  );
  const assignJson: any = await assignRes.json();
  const assignErrs = assignJson.data?.productVariantAppendMedia?.userErrors ?? [];
  if (assignErrs.length) return assignErrs.map((e: any) => e.message).join(", ");

  return null; // success
}
