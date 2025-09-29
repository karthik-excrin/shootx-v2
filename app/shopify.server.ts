import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-01";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: "2024-01",
  scopes: ["read_products", "write_products", "write_script_tags", "read_orders"],
  appUrl: process.env.SHOPIFY_APP_URL || process.env.HOST,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  restResources,
  hooks: {
    afterAuth: async ({ session }) => {
      console.log(`App installed for shop: ${session.shop}`);
      
      // Create or update shop record
      await prisma.shop.upsert({
        where: { shopDomain: session.shop },
        update: { isActive: true },
        create: {
          shopId: session.shop.replace('.myshopify.com', ''),
          shopDomain: session.shop,
          isActive: true,
        },
      });
    },
  },
});

export default shopify;
export const apiVersion = "2024-01";
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;