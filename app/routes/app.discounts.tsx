import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { createDiscount, deleteDiscount, fetchDiscounts, type DiscountRow } from "../lib/graphql/discounts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { rows } = await fetchDiscounts(admin);
  return { rows };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  if (actionType === "create") {
    const title = ((formData.get("title") as string) || "").trim();
    const code = ((formData.get("code") as string) || "").trim();
    const valueType = formData.get("valueType") as "percentage" | "fixed";
    const value = Number(formData.get("value"));
    const startsAt = (formData.get("startsAt") as string) || new Date().toISOString();
    const endsAt = (formData.get("endsAt") as string) || undefined;

    if (!title) return { ok: false, message: "Title is required." };
    if (Number.isNaN(value) || value <= 0) return { ok: false, message: "Enter a valid discount value." };

    const result = await createDiscount(admin, {
      title,
      code: code || undefined,
      valueType,
      value,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
    });

    return result.errors.length
      ? { ok: false, message: result.errors.join("; ") }
      : { ok: true, message: `Created discount "${title}".` };
  }

  if (actionType === "delete") {
    const id = formData.get("id") as string;
    const kind = formData.get("kind") as "code" | "automatic";
    const result = await deleteDiscount(admin, id, kind);
    return result.errors.length
      ? { ok: false, message: result.errors.join("; ") }
      : { ok: true, message: "Discount deleted." };
  }

  return { ok: false, message: "Unknown action." };
};

export default function Discounts() {
  const { rows } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const isBusy = fetcher.state !== "idle" || navigation.state !== "idle";

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [valueType, setValueType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    if (fetcher.data?.ok) {
      setTitle("");
      setCode("");
      setValue("");
      setStartsAt("");
      setEndsAt("");
    }
  }, [fetcher.data]);

  const submitCreate = () => {
    const fd = new FormData();
    fd.append("_action", "create");
    fd.append("title", title);
    fd.append("code", code);
    fd.append("valueType", valueType);
    fd.append("value", value);
    if (startsAt) fd.append("startsAt", startsAt);
    if (endsAt) fd.append("endsAt", endsAt);
    fetcher.submit(fd, { method: "POST" });
  };

  const submitDelete = (row: DiscountRow) => {
    const fd = new FormData();
    fd.append("_action", "delete");
    fd.append("id", row.id);
    fd.append("kind", row.kind);
    fetcher.submit(fd, { method: "POST" });
  };

  return (
    <s-page heading="Discounts">
      {fetcher.data && "message" in fetcher.data && (
        <s-banner tone={fetcher.data.ok ? "success" : "critical"} heading={fetcher.data.message} />
      )}

      <s-section heading="Create discount">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-text-field label="Title" value={title} onChange={(e: any) => setTitle(e.target.value)} />
            <s-text-field
              label="Code (leave blank for automatic discount)"
              value={code}
              onChange={(e: any) => setCode(e.target.value)}
              placeholder="e.g. SAVE10"
            />
          </s-stack>
          <s-stack direction="inline" gap="base">
            <s-select label="Discount type" value={valueType} onChange={(e: any) => setValueType(e.target.value)}>
              <s-option value="percentage">Percentage off</s-option>
              <s-option value="fixed">Fixed amount off</s-option>
            </s-select>
            <s-number-field
              label={valueType === "percentage" ? "Percent off" : "Amount off"}
              value={value}
              onChange={(e: any) => setValue(e.target.value)}
              placeholder={valueType === "percentage" ? "10" : "5.00"}
            />
          </s-stack>
          <s-stack direction="inline" gap="base">
            <s-date-field label="Starts" value={startsAt} onChange={(e: any) => setStartsAt(e.target.value)} />
            <s-date-field label="Ends (optional)" value={endsAt} onChange={(e: any) => setEndsAt(e.target.value)} />
          </s-stack>
          <s-button disabled={!title || !value || isBusy} onClick={submitCreate}>
            Create discount
          </s-button>
        </s-stack>
      </s-section>

      <s-section heading="Existing discounts">
        <s-table variant="list" loading={isBusy}>
          <s-table-header-row>
            <s-table-header>Title</s-table-header>
            <s-table-header>Type</s-table-header>
            <s-table-header>Code</s-table-header>
            <s-table-header>Value</s-table-header>
            <s-table-header>Status</s-table-header>
            <s-table-header>Starts</s-table-header>
            <s-table-header>Ends</s-table-header>
            <s-table-header></s-table-header>
          </s-table-header-row>
          <s-table-body>
            {rows.map((row: DiscountRow) => (
              <s-table-row key={row.id}>
                <s-table-cell>{row.title}</s-table-cell>
                <s-table-cell>{row.kind}</s-table-cell>
                <s-table-cell>{row.code ?? "—"}</s-table-cell>
                <s-table-cell>{row.summary}</s-table-cell>
                <s-table-cell>{row.status}</s-table-cell>
                <s-table-cell>{new Date(row.startsAt).toLocaleDateString()}</s-table-cell>
                <s-table-cell>{row.endsAt ? new Date(row.endsAt).toLocaleDateString() : "—"}</s-table-cell>
                <s-table-cell>
                  <s-button variant="tertiary" tone="critical" disabled={isBusy} onClick={() => submitDelete(row)}>
                    Delete
                  </s-button>
                </s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>
    </s-page>
  );
}
