import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Shop has fully uninstalled and requested erasure — clear any remaining session rows.
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
