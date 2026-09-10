import { useState } from "react";
import type { ActionFunctionArgs } from "react-router";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import {
  parseImportCsv,
  findLocationIdByName,
  createImportedProduct,
  uploadAndAttachImage,
  deleteExistingProductsByTitle,
  setComplementaryProducts,
  type ImportRow,
} from "../lib/graphql/product-import";

const SAMPLE_CSV = `SKU,Title,Description,Vendor,Type,Tags,Price,CompareAtPrice,WeightGrams,Cost,Collection,Group,MPN
ABC001,Example Cushion Cover Blue,A soft cushion cover in blue.,HOKIPO,Cushion Cover,"Cushion, New Launch",899,899,300,350,Cushions,Example Design,MPN-001
ABC002,Example Cushion Cover Green,A soft cushion cover in green.,HOKIPO,Cushion Cover,"Cushion, New Launch",899,899,300,350,Cushions,Example Design,MPN-002`;

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
  const csvText = String(formData.get("csvText") || "");
  const location = String(formData.get("location") || "Vasai").trim();
  const removeExisting = formData.get("removeExisting") === "true";

  const { rows, errors: parseErrors } = parseImportCsv(csvText);
  if (rows.length === 0) {
    return { ok: false, message: `No valid rows parsed. ${parseErrors.join(" | ")}` };
  }

  const { id: locationId, error: locationError } = await findLocationIdByName(admin, location);
  if (!locationId) {
    return { ok: false, message: `Could not find a location named "${location}"${locationError ? ` — ${locationError}` : ""}.` };
  }

  let duplicatesRemoved = 0;
  if (removeExisting) {
    for (const row of rows) duplicatesRemoved += await deleteExistingProductsByTitle(admin, row.title);
  }

  const log: string[] = [];
  let created = 0;
  let imagesAttached = 0;
  const imageIssues: string[] = [];
  const productIdBySku = new Map<string, string>();

  const createOne = async (row: ImportRow) => {
    const { productId, variantId, errors } = await createImportedProduct(admin, row, locationId);
    if (!productId) {
      log.push(`${row.sku}: FAILED — ${errors.join("; ")}`);
      return;
    }
    created++;
    productIdBySku.set(row.sku, productId);
    if (errors.length) log.push(`${row.sku}: warnings — ${errors.join("; ")}`);

    const file = formData.get(row.sku) as File | null;
    if (!file || file.size === 0) return; // images are optional for the generic importer
    const bytes = new Uint8Array(await file.arrayBuffer());
    const err = await uploadAndAttachImage(admin, productId, variantId, `${row.sku}.jpg`, file.type || "image/jpeg", bytes);
    if (err) imageIssues.push(`${row.sku}: ${err}`);
    else imagesAttached++;
  };

  const CONCURRENCY = 4;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(rows.slice(i, i + CONCURRENCY).map(createOne));
  }

  // Link rows that share a non-empty Group value as sibling/complementary products.
  let linked = 0;
  const groups = new Map<string, ImportRow[]>();
  for (const row of rows) {
    if (!row.group) continue;
    if (!groups.has(row.group)) groups.set(row.group, []);
    groups.get(row.group)!.push(row);
  }
  for (const groupRows of groups.values()) {
    for (const row of groupRows) {
      const productId = productIdBySku.get(row.sku);
      if (!productId) continue;
      const siblingIds = groupRows
        .filter((r) => r.sku !== row.sku)
        .map((r) => productIdBySku.get(r.sku))
        .filter((id): id is string => Boolean(id));
      if (siblingIds.length === 0) continue;
      const err = await setComplementaryProducts(admin, productId, siblingIds);
      if (!err) linked++;
    }
  }

  return {
    ok: created > 0,
    message: `${removeExisting ? `Removed ${duplicatesRemoved} existing product(s) with matching titles. ` : ""}Created ${created} of ${rows.length} products. Attached ${imagesAttached} images. Linked siblings on ${linked} products.${
      parseErrors.length ? " Parse notes: " + parseErrors.join(" | ") : ""
    }${log.length ? " Warnings: " + log.slice(0, 15).join(" | ") : ""}${
      imageIssues.length ? " Image issues: " + imageIssues.slice(0, 10).join(" | ") : ""
    }`,
  };
}

export default function ImportPage() {
  const fetcher = useFetcher<typeof action>();
  const isBusy = fetcher.state !== "idle";
  const [csvText, setCsvText] = useState("");
  const [location, setLocation] = useState("Vasai");
  const [removeExisting, setRemoveExisting] = useState(false);
  const [files, setFiles] = useState<Record<string, File>>({});

  const skusInCsv = csvText
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(",")[0]?.trim())
    .filter(Boolean);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next = { ...files };
    for (const file of Array.from(fileList)) {
      const sku = file.name.replace(/\.[^.]+$/, "");
      next[sku] = file;
    }
    setFiles(next);
  };

  const submit = () => {
    const fd = new FormData();
    fd.append("csvText", csvText);
    fd.append("location", location);
    fd.append("removeExisting", String(removeExisting));
    for (const sku of skusInCsv) {
      if (files[sku]) fd.append(sku, files[sku]);
    }
    fetcher.submit(fd, { method: "POST", encType: "multipart/form-data" });
  };

  return (
    <s-page heading="Universal Product Importer">
      {fetcher.data && "message" in fetcher.data && (
        <s-banner tone={fetcher.data.ok ? "success" : "critical"} heading={fetcher.data.message} />
      )}

      <s-section heading="Import any products from a CSV">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Columns: SKU, Title, Description, Vendor, Type, Tags, Price, CompareAtPrice,
            WeightGrams, Cost, Collection, Group, MPN. Only SKU, Title, and Price are
            required — everything else can be left blank. Rows sharing the same "Group"
            value get linked as sibling/color-variant products (shown via Swatch King once
            you add them to a group there, or via the Complementary Products block).
          </s-paragraph>
          <s-text-area
            label="Ranking CSV content"
            value={csvText}
            onChange={(e: any) => setCsvText(e.target.value)}
            rows={10}
          />
          <s-button
            variant="tertiary"
            onClick={() => setCsvText(SAMPLE_CSV)}
          >
            Fill in example CSV
          </s-button>
          <s-text-field
            label="Inventory location (must match exactly)"
            value={location}
            onChange={(e: any) => setLocation(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={removeExisting}
              onChange={(e) => setRemoveExisting(e.target.checked)}
            />{" "}
            Remove existing products with matching titles first (safe reruns)
          </label>
          <s-paragraph>
            Optional: select image files named by SKU (e.g. ABC001.jpg) — matched
            automatically. {skusInCsv.filter((s) => files[s]).length} of {skusInCsv.length}{" "}
            SKUs have an image selected.
          </s-paragraph>
          <input type="file" multiple accept="image/*" onChange={(e) => handleFiles(e.target.files)} />
          <s-button disabled={!csvText || isBusy} onClick={submit}>
            {isBusy ? "Importing…" : "Import products"}
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
