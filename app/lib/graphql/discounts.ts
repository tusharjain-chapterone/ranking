import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

export type DiscountRow = {
  id: string;
  kind: "code" | "automatic";
  title: string;
  status: string;
  code: string | null;
  startsAt: string;
  endsAt: string | null;
  summary: string;
};

const DISCOUNTS_QUERY = `#graphql
  query OpsAppDiscounts($cursor: String) {
    discountNodes(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          discount {
            __typename
            ... on DiscountCodeBasic {
              title
              status
              startsAt
              endsAt
              codes(first: 1) {
                edges { node { code } }
              }
              customerGets {
                value {
                  __typename
                  ... on DiscountPercentage { percentage }
                  ... on DiscountAmount { amount { amount currencyCode } }
                }
              }
            }
            ... on DiscountAutomaticBasic {
              title
              status
              startsAt
              endsAt
              customerGets {
                value {
                  __typename
                  ... on DiscountPercentage { percentage }
                  ... on DiscountAmount { amount { amount currencyCode } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

function summarizeValue(value: any): string {
  if (!value) return "";
  if (value.__typename === "DiscountPercentage") {
    return `${(value.percentage * 100).toFixed(0)}% off`;
  }
  if (value.__typename === "DiscountAmount") {
    return `${value.amount.amount} ${value.amount.currencyCode} off`;
  }
  return "";
}

export async function fetchDiscounts(admin: AdminApiContext, cursor?: string) {
  const response = await admin.graphql(DISCOUNTS_QUERY, {
    variables: { cursor: cursor || null },
  });
  const json = await response.json();
  const connection = json.data!.discountNodes;

  const rows: DiscountRow[] = connection.edges
    .map(({ node }: any) => {
      const d = node.discount;
      if (!d) return null;
      const isCode = d.__typename === "DiscountCodeBasic";
      return {
        id: node.id,
        kind: isCode ? "code" : "automatic",
        title: d.title,
        status: d.status,
        code: isCode ? (d.codes.edges[0]?.node?.code ?? null) : null,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        summary: summarizeValue(d.customerGets?.value),
      } as DiscountRow;
    })
    .filter(Boolean);

  return { rows, pageInfo: connection.pageInfo as { hasNextPage: boolean; endCursor: string | null } };
}

type CreateDiscountInput = {
  title: string;
  code?: string;
  valueType: "percentage" | "fixed";
  value: number;
  startsAt: string;
  endsAt?: string;
};

export async function createDiscount(admin: AdminApiContext, input: CreateDiscountInput) {
  const customerGetsValue =
    input.valueType === "percentage"
      ? { percentage: input.value / 100 }
      : { discountAmount: { amount: input.value, appliesOnEachItem: true } };

  if (input.code) {
    const response = await admin.graphql(
      `#graphql
        mutation OpsAppCreateCodeDiscount($basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode { id }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          basicCodeDiscount: {
            title: input.title,
            code: input.code,
            startsAt: input.startsAt,
            endsAt: input.endsAt || null,
            customerSelection: { all: true },
            customerGets: {
              items: { all: true },
              value: customerGetsValue,
            },
          },
        },
      },
    );
    const json = await response.json();
    return {
      id: json.data?.discountCodeBasicCreate?.codeDiscountNode?.id ?? null,
      errors: (json.data?.discountCodeBasicCreate?.userErrors ?? []).map((e: any) => e.message),
    };
  }

  const response = await admin.graphql(
    `#graphql
      mutation OpsAppCreateAutomaticDiscount($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
        discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
          automaticDiscountNode { id }
          userErrors { field message }
        }
      }
    `,
    {
      variables: {
        automaticBasicDiscount: {
          title: input.title,
          startsAt: input.startsAt,
          endsAt: input.endsAt || null,
          customerGets: {
            items: { all: true },
            value: customerGetsValue,
          },
        },
      },
    },
  );
  const json = await response.json();
  return {
    id: json.data?.discountAutomaticBasicCreate?.automaticDiscountNode?.id ?? null,
    errors: (json.data?.discountAutomaticBasicCreate?.userErrors ?? []).map((e: any) => e.message),
  };
}

export async function deleteDiscount(admin: AdminApiContext, id: string, kind: "code" | "automatic") {
  const mutation =
    kind === "code"
      ? `#graphql
          mutation OpsAppDeleteCodeDiscount($id: ID!) {
            discountCodeDelete(id: $id) {
              deletedCodeDiscountId
              userErrors { field message }
            }
          }
        `
      : `#graphql
          mutation OpsAppDeleteAutomaticDiscount($id: ID!) {
            discountAutomaticDelete(id: $id) {
              deletedAutomaticDiscountId
              userErrors { field message }
            }
          }
        `;
  const response = await admin.graphql(mutation, { variables: { id } });
  const json = await response.json();
  const payload = kind === "code" ? json.data?.discountCodeDelete : json.data?.discountAutomaticDelete;
  return { errors: (payload?.userErrors ?? []).map((e: any) => e.message) };
}
