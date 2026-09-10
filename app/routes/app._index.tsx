import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="hokipo1 Ops">
      <s-section heading="Control panel for hokipo1.myshopify.com">
        <s-paragraph>
          Bulk-manage products and discounts from one place. More areas (tax
          visibility, automation rules) are being added over time.
        </s-paragraph>
      </s-section>

      <s-section heading="Products">
        <s-paragraph>
          Filter by tag, bulk-edit status, tags, and price across many products at once.
        </s-paragraph>
        <s-link href="/app/products">Open Products →</s-link>
      </s-section>

      <s-section heading="Discounts">
        <s-paragraph>Create and manage automatic and code-based discounts.</s-paragraph>
        <s-link href="/app/discounts">Open Discounts →</s-link>
      </s-section>

      <s-section heading="Collection Ranking">
        <s-paragraph>
          Paste a ranking sheet to reorder products within an existing collection.
        </s-paragraph>
        <s-link href="/app/ranking">Open Ranking →</s-link>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
