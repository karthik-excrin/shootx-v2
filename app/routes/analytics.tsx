import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  DataTable,
  Badge,
  Stack,
  ProgressBar,
  Thumbnail,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!shop) {
    return json({ 
      totalRequests: 0, 
      completionRate: 0,
      recentRequests: [],
      topProducts: []
    });
  }

  const totalRequests = await prisma.tryOnRequest.count({
    where: { shopId: shop.shopId },
  });

  const completedRequests = await prisma.tryOnRequest.count({
    where: { 
      shopId: shop.shopId,
      status: 'completed' 
    },
  });

  const recentRequests = await prisma.tryOnRequest.findMany({
    where: { shopId: shop.shopId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const topProducts = await prisma.tryOnRequest.groupBy({
    by: ['productId', 'productTitle'],
    where: { shopId: shop.shopId },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 10,
  });

  return json({
    totalRequests,
    completionRate: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0,
    recentRequests,
    topProducts: topProducts.map(p => ({
      productId: p.productId,
      productTitle: p.productTitle,
      count: p._count.id,
    })),
  });
};

export default function Analytics() {
  const { totalRequests, completionRate, recentRequests, topProducts } = useLoaderData<typeof loader>();

  const recentRequestRows = recentRequests.map((request: any) => [
    <Thumbnail
      source="https://via.placeholder.com/40x40/007acc/ffffff?text=T"
      alt={request.productTitle}
      size="small"
    />,
    request.productTitle,
    <Badge status={
      request.status === 'completed' ? 'success' : 
      request.status === 'failed' ? 'critical' : 'info'
    }>
      {request.status}
    </Badge>,
    new Date(request.createdAt).toLocaleDateString(),
    new Date(request.createdAt).toLocaleTimeString(),
  ]);

  const topProductRows = topProducts.map((product: any) => [
    <Thumbnail
      source="https://via.placeholder.com/40x40/007acc/ffffff?text=P"
      alt={product.productTitle}
      size="small"
    />,
    product.productTitle,
    product.count,
    <ProgressBar progress={(product.count / (topProducts[0]?.count || 1)) * 100} size="small" />,
  ]);

  return (
    <Page title="Analytics">
      <Layout>
        <Layout.Section>
          <Card>
            <Stack distribution="fillEvenly">
              <div style={{ textAlign: 'center' }}>
                <Text variant="headingXl" as="h3" color="success">
                  {totalRequests}
                </Text>
                <Text variant="bodyMd" as="p" color="subdued">
                  Total Try-On Requests
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text variant="headingXl" as="h3" color="warning">
                  {completionRate}%
                </Text>
                <Text variant="bodyMd" as="p" color="subdued">
                  Success Rate
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text variant="headingXl" as="h3" color="info">
                  {recentRequests.filter((r: any) => r.status === 'processing').length}
                </Text>
                <Text variant="bodyMd" as="p" color="subdued">
                  Currently Processing
                </Text>
              </div>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text variant="headingLg" as="h2">
              Recent Try-On Requests
            </Text>
            <div style={{ marginTop: '16px' }}>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                headings={['', 'Product', 'Status', 'Date', 'Time']}
                rows={recentRequestRows}
                footerContent={`Showing ${Math.min(recentRequests.length, 20)} of ${totalRequests} total requests`}
              />
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text variant="headingLg" as="h2">
              Most Popular Products
            </Text>
            <div style={{ marginTop: '16px' }}>
              <DataTable
                columnContentTypes={['text', 'text', 'numeric', 'text']}
                headings={['', 'Product', 'Try-Ons', 'Popularity']}
                rows={topProductRows}
                footerContent={`Top ${topProducts.length} products by try-on requests`}
              />
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}