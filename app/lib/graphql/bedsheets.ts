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

export async function deleteExistingProductsByTitle(admin: AdminApiContext, title: string): Promise<number> {
  try {
    const res = await admin.graphql(
      `#graphql
        query FindProducts($query: String!) {
          products(first: 20, query: $query) {
            nodes { id }
          }
        }
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

  const baseProductInput: any = {
    title: def.title,
    descriptionHtml: `<p>${description}</p>`,
    vendor: "HOKIPO",
    productType: "Bedsheet",
    tags,
    status: "ACTIVE",
    handle: def.handle,
    seo: { title: def.title, description: description.slice(0, 155) },
    productOptions: [{ name: "Color", values: def.variants.map((v) => ({ name: v.color })) }],
    ...(collectionId ? { collectionsToJoin: [collectionId] } : {}),
  };

  const runCreate = async (input: any) => {
    const res = await admin.graphql(
      `#graphql
        mutation CreateProduct($product: ProductCreateInput!) {
          productCreate(product: $product) {
            product {
              id
              variants(first: 20) {
                nodes { id selectedOptions { name value } }
              }
            }
            userErrors { field message }
          }
        }
      `,
      { variables: { product: input } },
    );
    const json: any = await res.json();
    return {
      productId: json.data?.productCreate?.product?.id as string | undefined,
      autoVariants: (json.data?.productCreate?.product?.variants?.nodes ?? []) as {
        id: string;
        selectedOptions: { name: string; value: string }[];
      }[],
      userErrors: (json.data?.productCreate?.userErrors ?? []) as { field: string[]; message: string }[],
    };
  };

  let { productId, autoVariants, userErrors: createErrs } = await runCreate(baseProductInput);

  // Self-heal a stale handle from a prior partial run: let Shopify auto-generate one instead.
  if (!productId && createErrs.some((e) => e.message.toLowerCase().includes("handle"))) {
    errors.push(`create: handle collision on "${def.handle}", retrying with auto-generated handle`);
    const { handle: _drop, ...withoutHandle } = baseProductInput;
    ({ productId, autoVariants, userErrors: createErrs } = await runCreate(withoutHandle));
  }

  if (createErrs.length) {
    errors.push(...createErrs.map((e) => `create: ${e.message}`));
  }
  if (!productId) {
    return { productId: "", variantIdBySku: new Map(), errors };
  }

  // productCreate only ever makes ONE default variant even though we declared all Color values
  // up front — so: update that one variant with real data, then bulk-CREATE the rest referencing
  // the Color option values that already exist on the product.
  const autoVariantIdByColor = new Map<string, string>();
  for (const av of autoVariants) {
    const colorValue = av.selectedOptions.find((o) => o.name === "Color")?.value;
    if (colorValue) autoVariantIdByColor.set(colorValue, av.id);
  }

  const alreadyExists = def.variants.filter((v) => autoVariantIdByColor.has(v.color));
  const needsCreating = def.variants.filter((v) => !autoVariantIdByColor.has(v.color));

  const variantFields = (v: (typeof def.variants)[number]) => ({
    price: def.price.toFixed(2),
    compareAtPrice: def.price.toFixed(2),
    taxable: false,
    barcode: v.sku,
    inventoryItem: {
      sku: v.sku,
      tracked: true,
      cost: def.vendorCost.toFixed(2),
      measurement: { weight: { value: def.weightG, unit: "GRAMS" } },
    },
    inventoryPolicy: "DENY",
  });

  const variantIdBySku = new Map<string, string>();

  const updateInput = alreadyExists.map((v) => ({
    id: autoVariantIdByColor.get(v.color)!,
    ...variantFields(v),
  }));
  if (updateInput.length) {
    const updateRes = await admin.graphql(
      `#graphql
        mutation UpdateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id sku }
            userErrors { field message }
          }
        }
      `,
      { variables: { productId, variants: updateInput } },
    );
    const updateJson: any = await updateRes.json();
    const updateErrs = updateJson.data?.productVariantsBulkUpdate?.userErrors ?? [];
    if (updateErrs.length) errors.push(...updateErrs.map((e: any) => `variants update: ${e.message}`));

    for (const pv of updateJson.data?.productVariantsBulkUpdate?.productVariants ?? []) {
      if (pv.sku) variantIdBySku.set(pv.sku, pv.id);
    }
  }

  const createInput = needsCreating.map((v) => ({
    optionValues: [{ optionName: "Color", name: v.color }],
    ...variantFields(v),
  }));
  if (createInput.length) {
    const createVariantsRes = await admin.graphql(
      `#graphql
        mutation CreateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: DEFAULT) {
            productVariants { id sku }
            userErrors { field message }
          }
        }
      `,
      { variables: { productId, variants: createInput } },
    );
    const createVariantsJson: any = await createVariantsRes.json();
    const createVariantsErrs = createVariantsJson.data?.productVariantsBulkCreate?.userErrors ?? [];
    if (createVariantsErrs.length) {
      errors.push(...createVariantsErrs.map((e: any) => `variants create: ${e.message}`));
    }
    for (const pv of createVariantsJson.data?.productVariantsBulkCreate?.productVariants ?? []) {
      if (pv.sku) variantIdBySku.set(pv.sku, pv.id);
    }
  }

  // Best-effort: activate the inventory item at the Vasai location (0 qty) so it's tied to the
  // right warehouse for fulfillment-order splitting. Non-fatal if it fails on any single variant.
  for (const v of def.variants) {
    const variantId = variantIdBySku.get(v.sku);
    if (!variantId) continue;
    try {
      const invRes = await admin.graphql(
        `#graphql
          query VariantInventoryItem($id: ID!) {
            productVariant(id: $id) { inventoryItem { id } }
          }
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
      // non-fatal — product/variant/price are already correct either way
    }
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
