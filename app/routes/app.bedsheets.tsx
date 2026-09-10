import { useState } from "react";
import type { ActionFunctionArgs } from "react-router";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { BEDSHEET_PRODUCTS } from "../lib/data/bedsheets";
import {
  createBedsheetProduct,
  findLocationIdByName,
  findCollectionIdByTitle,
  uploadAndAttachImage,
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

  const log: string[] = [];
  let productsCreated = 0;
  let imagesAttached = 0;
  const imageIssues: string[] = [];

  for (const def of BEDSHEET_PRODUCTS) {
    const { productId, variantIdBySku, errors } = await createBedsheetProduct(admin, def, locationId, collectionId);
    if (!productId) {
      log.push(`${def.title}: FAILED to create — ${errors.join("; ")}`);
      continue;
    }
    productsCreated++;
    if (errors.length) log.push(`${def.title}: created with warnings — ${errors.join("; ")}`);

    for (const v of def.variants) {
      const file = formData.get(v.sku) as File | null;
      const variantId = variantIdBySku.get(v.sku);
      if (!file || file.size === 0) {
        imageIssues.push(`${v.sku}: no image uploaded`);
        continue;
      }
      if (!variantId) {
        imageIssues.push(`${v.sku}: variant wasn't created, can't attach image`);
        continue;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const err = await uploadAndAttachImage(admin, productId, variantId, `${v.sku}.jpg`, "image/jpeg", bytes);
      if (err) imageIssues.push(`${v.sku}: ${err}`);
      else imagesAttached++;
    }
  }

  const totalVariants = BEDSHEET_PRODUCTS.reduce((n, p) => n + p.variants.length, 0);
  return {
    ok: productsCreated > 0,
    message: `Created ${productsCreated} of ${BEDSHEET_PRODUCTS.length} products. Attached ${imagesAttached} of ${totalVariants} images.${
      collectionId ? "" : ' Note: no "Bedsheets" collection found — products created but not added to any collection.'
    }${log.length ? " Warnings: " + log.join(" | ") : ""}${
      imageIssues.length ? " Image issues: " + imageIssues.slice(0, 10).join(" | ") : ""
    }`,
  };
};

const ALL_SKUS = BEDSHEET_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku));

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

      <s-section heading="Allure / Hibond / Feather Touch / Vintage collections">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Creates all 4 bedsheet products ({ALL_SKUS.length} variants total) with content,
            pricing, and inventory already filled in. Select the 23 SKU-named image files
            (e.g. AND038026.jpg) below — they'll be matched to the right variant automatically.
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
