import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

const HANDLE = "luxurious-stretchable-spandex-jacquard-sofa-cum-bed-cover-for-futon-taupe-brown";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(
    `#graphql
      query InspectProduct($handle: String!) {
        productByHandle(handle: $handle) {
          id
          title
          tags
          options { name values }
          metafields(first: 50) {
            nodes { namespace key type value }
          }
          variants(first: 10) {
            nodes {
              id
              sku
              selectedOptions { name value }
              metafields(first: 20) {
                nodes { namespace key type value }
              }
            }
          }
        }
      }
    `,
    { variables: { handle: HANDLE } },
  );
  const json: any = await res.json();
  return { product: json.data?.productByHandle ?? null, raw: JSON.stringify(json, null, 2) };
};

export default function InspectPage() {
  const { raw } = useLoaderData<typeof loader>();
  return (
    <s-page heading="Inspect">
      <s-section heading="Product data">
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "11px" }}>{raw}</pre>
      </s-section>
    </s-page>
  );
}
