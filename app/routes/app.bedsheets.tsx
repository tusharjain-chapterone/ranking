import { useState } from "react";
import type { ActionFunctionArgs } from "react-router";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { BEDSHEET_ITEMS } from "../lib/data/bedsheet-items";
import { BEDSHEET_PRODUCTS as OLD_GROUPED_PRODUCTS } from "../lib/data/bedsheets";
import {
  createBedsheetItem,
  findLocationIdByName,
  findCollectionIdByTitle,
  uploadAndAttachImage,
  deleteExistingProductsByTitle,
} from "../lib/graphql/bedsheets";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    return await runAction(request);
  } catch (err: any) {
    return { ok: false, message: `Unexpected error: ${err?.message ?? String(err)}` };
  }
};

async function runAction(request: Request) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const { id: locationId, error: locationError } = await findLocationIdByName(admin, "Vasai");
  if (!locationId) {
    return {
      ok: false,
      message: `Could not find a location named "Vasai"${locationError ? ` — ${locationError}` : " — check Settings > Locations spelling."}`,
    };
  }
  const collectionId = await findCollectionIdByTitle(admin, "Bedsheets");

  let duplicatesRemoved = 0;
  // Clean up the old grouped (4-product-with-variants) versions from the earlier attempt.
  for (const old of OLD_GROUPED_PRODUCTS) {
    duplicatesRemoved += await deleteExistingProductsByTitle(admin, old.title);
  }
  // Clean up any previous run of the 23-item version too, so reruns are idempotent.
  for (const item of BEDSHEET_ITEMS) {
    duplicatesRemoved += await deleteExistingProductsByTitle(admin, item.title);
  }

  const log: string[] = [];
  let productsCreated = 0;
  let imagesAttached = 0;
  const imageIssues: string[] = [];

  const createOne = async (item: (typeof BEDSHEET_ITEMS)[number]) => {
    const { productId, variantId, errors } = await createBedsheetItem(admin, item, locationId, collectionId);
    if (!productId) {
      log.push(`${item.sku}: FAILED to create — ${errors.join("; ")}`);
      return;
    }
    productsCreated++;
    if (errors.length) log.push(`${item.sku}: created with warnings — ${errors.join("; ")}`);

    const file = formData.get(item.sku) as File | null;
    if (!file || file.size === 0) {
      imageIssues.push(`${item.sku}: no image uploaded`);
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const err = await uploadAndAttachImage(admin, productId, variantId, `${item.sku}.jpg`, "image/jpeg", bytes);
    if (err) imageIssues.push(`${item.sku}: ${err}`);
    else imagesAttached++;
  };

  const CONCURRENCY = 4;
  for (let i = 0; i < BEDSHEET_ITEMS.length; i += CONCURRENCY) {
    await Promise.all(BEDSHEET_ITEMS.slice(i, i + CONCURRENCY).map(createOne));
  }

  return {
    ok: productsCreated > 0,
    message: `Removed ${duplicatesRemoved} old/duplicate product(s). Created ${productsCreated} of ${BEDSHEET_ITEMS.length} individual products. Attached ${imagesAttached} of ${BEDSHEET_ITEMS.length} images.${
      collectionId ? "" : ' Note: no "Bedsheets" collection found — products created but not added to any collection.'
    }${log.length ? " Warnings: " + log.join(" | ") : ""}${
      imageIssues.length ? " Image issues: " + imageIssues.slice(0, 10).join(" | ") : ""
    }`,
  };
};

const ALL_SKUS = BEDSHEET_ITEMS.map((it) => it.sku);

export default function BedsheetsPage() {
  const fetcher = useFetcher<typeof action>();
  const isBusy = fetcher.state !== "idle";
  const [files, setFiles] = useState<Record<string, File>>({});

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next = { ...files };
    for (const file of Array.from(fileList)) {
      const sku = file.name.replace(/\.[^.]+$/, "").toUpperCase();
      if (ALL_SKUS.includes(sku)) next[sku] = file;
    }
    setFiles(next);
  };

  const submit = () => {
    const fd = new FormData();
    for (const sku of ALL_SKUS) {
      if (files[sku]) fd.append(sku, files[sku]);
    }
    fetcher.submit(fd, { method: "POST", encType: "multipart/form-data" });
  };

  const matchedCount = Object.keys(files).length;

  return (
    <s-page heading="Create Bedsheet Products">
      {fetcher.data && "message" in fetcher.data && (
        <s-banner tone={fetcher.data.ok ? "success" : "critical"} heading={fetcher.data.message} />
      )}

      <s-section heading="23 individual bedsheet products">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Creates all 23 bedsheets as separate, individually visible products (not grouped
            with a color picker) — each with its own title, description, price, and image.
            Select the 23 SKU-named image files (e.g. AND038026.jpg) below.
          </s-paragraph>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <s-paragraph>{matchedCount} of {ALL_SKUS.length} images matched.</s-paragraph>
          <s-button disabled={isBusy} onClick={submit}>
            {isBusy ? "Creating…" : "Create products"}
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
