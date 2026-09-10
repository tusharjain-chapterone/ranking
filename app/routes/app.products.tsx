import { useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useFetcher, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import {
  bulkAddTag,
  bulkAdjustPrice,
  bulkSetStatus,
  fetchProducts,
  type ProductRow,
} from "../lib/graphql/products";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag") || "";
  const cursor = url.searchParams.get("cursor") || undefined;
  const { rows, pageInfo } = await fetchProducts(admin, {
    query: tag ? `tag:${tag}` : undefined,
    cursor,
  });
  return { rows, pageInfo, tag };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;
  const productIds = formData.getAll("productIds") as string[];

  if (!productIds.length) {
    return { ok: false, message: "Select at least one product first." };
  }

  if (actionType === "setStatus") {
    const status = formData.get("status") as "ACTIVE" | "DRAFT" | "ARCHIVED";
    const errors = await bulkSetStatus(admin, productIds, status);
    return errors.length
      ? { ok: false, message: errors.join("; ") }
      : { ok: true, message: `Updated status on ${productIds.length} product(s).` };
  }

  if (actionType === "addTag") {
    const tag = ((formData.get("tag") as string) || "").trim();
    if (!tag) return { ok: false, message: "Enter a tag to add." };
    const errors = await bulkAddTag(admin, productIds, tag);
    return errors.length
      ? { ok: false, message: errors.join("; ") }
      : { ok: true, message: `Added tag "${tag}" to ${productIds.length} product(s).` };
  }

  if (actionType === "adjustPrice") {
    const mode = formData.get("priceMode") as "set" | "percent";
    const value = Number(formData.get("priceValue"));
    if (Number.isNaN(value)) return { ok: false, message: "Enter a valid price value." };
    const items = JSON.parse((formData.get("priceItems") as string) || "[]") as {
      productId: string;
      variantId: string;
      currentPrice: string;
    }[];
    const errors = await bulkAdjustPrice(admin, items, mode, value);
    return errors.length
      ? { ok: false, message: errors.join("; ") }
      : { ok: true, message: `Adjusted price on ${items.length} product(s).` };
  }

  return { ok: false, message: "Unknown action." };
};

export default function Products() {
  const { rows, pageInfo, tag } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const isBusy = fetcher.state !== "idle" || navigation.state !== "idle";

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("ACTIVE");
  const [tagToAdd, setTagToAdd] = useState("");
  const [priceMode, setPriceMode] = useState<"set" | "percent">("percent");
  const [priceValue, setPriceValue] = useState("");

  useEffect(() => {
    if (fetcher.data && "ok" in fetcher.data) {
      setSelected({});
    }
  }, [fetcher.data]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  );
  const selectedRows = useMemo(
    () => rows.filter((r: ProductRow) => selected[r.id]),
    [rows, selected],
  );

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => ({ ...prev, [id]: checked }));

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    rows.forEach((r: ProductRow) => (next[r.id] = checked));
    setSelected(next);
  };

  const submitBulk = (extra: Record<string, string>) => {
    const fd = new FormData();
    selectedIds.forEach((id) => fd.append("productIds", id));
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    fetcher.submit(fd, { method: "POST" });
  };

  return (
    <s-page heading="Products">
      {fetcher.data && "message" in fetcher.data && (
        <s-banner tone={fetcher.data.ok ? "success" : "critical"} heading={fetcher.data.message} />
      )}

      <s-section heading="Filter">
        <Form method="get">
          <s-stack direction="inline" gap="base" alignItems="end">
            <s-text-field label="Filter by tag" name="tag" defaultValue={tag} placeholder="e.g. internal-test" />
            <s-button type="submit">Apply filter</s-button>
            {tag && <s-link href="/app/products">Clear</s-link>}
          </s-stack>
        </Form>
      </s-section>

      <s-section heading={`Bulk actions (${selectedIds.length} selected)`}>
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="end">
            <s-select label="Set status to" name="status" value={status} onChange={(e: any) => setStatus(e.target.value)}>
              <s-option value="ACTIVE">Active</s-option>
              <s-option value="DRAFT">Draft</s-option>
              <s-option value="ARCHIVED">Archived</s-option>
            </s-select>
            <s-button
              disabled={!selectedIds.length || isBusy}
              onClick={() => submitBulk({ _action: "setStatus", status })}
            >
              Apply status
            </s-button>
          </s-stack>

          <s-stack direction="inline" gap="base" alignItems="end">
            <s-text-field
              label="Add tag"
              value={tagToAdd}
              onChange={(e: any) => setTagToAdd(e.target.value)}
              placeholder="e.g. clearance"
            />
            <s-button
              disabled={!selectedIds.length || !tagToAdd.trim() || isBusy}
              onClick={() => submitBulk({ _action: "addTag", tag: tagToAdd })}
            >
              Add tag
            </s-button>
          </s-stack>

          <s-stack direction="inline" gap="base" alignItems="end">
            <s-select label="Price change" value={priceMode} onChange={(e: any) => setPriceMode(e.target.value)}>
              <s-option value="percent">Percent (+/-)</s-option>
              <s-option value="set">Set exact price</s-option>
            </s-select>
            <s-number-field
              label={priceMode === "percent" ? "% change" : "New price"}
              value={priceValue}
              onChange={(e: any) => setPriceValue(e.target.value)}
              placeholder={priceMode === "percent" ? "-10" : "19.99"}
            />
            <s-button
              disabled={!selectedIds.length || !priceValue || isBusy}
              onClick={() =>
                submitBulk({
                  _action: "adjustPrice",
                  priceMode,
                  priceValue,
                  priceItems: JSON.stringify(
                    selectedRows.map((r: ProductRow) => ({
                      productId: r.id,
                      variantId: r.variantId,
                      currentPrice: r.price,
                    })),
                  ),
                })
              }
            >
              Apply price change
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="Products">
        <s-table variant="list" hasNextPage={pageInfo.hasNextPage} loading={isBusy}>
          <s-table-header-row>
            <s-table-header>
              <s-checkbox
                checked={rows.length > 0 && selectedIds.length === rows.length}
                onChange={(e: any) => toggleAll(e.target.checked)}
              />
            </s-table-header>
            <s-table-header>Title</s-table-header>
            <s-table-header>Status</s-table-header>
            <s-table-header>Inventory</s-table-header>
            <s-table-header>Price</s-table-header>
            <s-table-header>Tags</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {rows.map((row: ProductRow) => (
              <s-table-row key={row.id}>
                <s-table-cell>
                  <s-checkbox checked={!!selected[row.id]} onChange={(e: any) => toggle(row.id, e.target.checked)} />
                </s-table-cell>
                <s-table-cell>{row.title}</s-table-cell>
                <s-table-cell>{row.status}</s-table-cell>
                <s-table-cell>{row.totalInventory}</s-table-cell>
                <s-table-cell>{row.price}</s-table-cell>
                <s-table-cell>{row.tags.join(", ")}</s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
        {pageInfo.hasNextPage && (
          <Form method="get">
            {tag && <input type="hidden" name="tag" value={tag} />}
            <input type="hidden" name="cursor" value={pageInfo.endCursor ?? ""} />
            <s-button type="submit">Load more</s-button>
          </Form>
        )}
      </s-section>
    </s-page>
  );
}
