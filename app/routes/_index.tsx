import { LoaderFunctionArgs, ActionFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Button,
  Banner,
  Stack,
  TextContainer,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
    include: {
      tryOnRequests: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const stats = await prisma.tryOnRequest.groupBy({
    by: ['status'],
    where: { shopId: shop?.shopId || '' },
    _count: true,
  });

  const totalRequests = await prisma.tryOnRequest.count({
    where: { shopId: shop?.shopId || '' },
  });

  return json({
    shop,
    stats: stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {} as Record<string, number>),
    totalRequests,
    recentRequests: shop?.tryOnRequests || [],
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "toggle-status") {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain: session.shop },
    });

    if (shop) {
      await prisma.shop.update({
        where: { id: shop.id },
        data: { tryOnEnabled: !shop.tryOnEnabled },
      });
    }
  }

  return json({ success: true });
};

export default function Index() {
  const { shop, stats, totalRequests, recentRequests } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <Page title="ShootX Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <Stack vertical>
              <TextContainer>
                <Text variant="headingLg" as="h2">
                  Welcome to ShootX Virtual Try-On
                </Text>
                <Text variant="bodyMd" as="p" color="subdued">
                  Transform your customers' shopping experience with AI-powered virtual try-ons
                </Text>
              </TextContainer>
              
              <Stack distribution="fillEvenly">
                <div>
                  <Text variant="headingXl" as="h3" color="success">
                    {totalRequests}
                  </Text>
                  <Text variant="bodyMd" as="p" color="subdued">
                    Total Try-Ons
                  </Text>
                </div>
                <div>
                  <Text variant="headingXl" as="h3" color="warning">
                    {stats.processing || 0}
                  </Text>
                  <Text variant="bodyMd" as="p" color="subdued">
                    Processing
                  </Text>
                </div>
                <div>
                  <Text variant="headingXl" as="h3" color="success">
                    {stats.completed || 0}
                  </Text>
                  <Text variant="bodyMd" as="p" color="subdued">
                    Completed
                  </Text>
                </div>
                <div>
                  <Text variant="headingXl" as="h3" color="critical">
                    {stats.failed || 0}
                  </Text>
                  <Text variant="bodyMd" as="p" color="subdued">
                    Failed
                  </Text>
                </div>
              </Stack>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card>
            <Stack vertical>
              <Stack alignment="center" distribution="equalSpacing">
                <Text variant="headingMd" as="h3">
                  App Status
                </Text>
                <Badge status={shop?.tryOnEnabled ? "success" : "critical"}>
                  {shop?.tryOnEnabled ? "Active" : "Inactive"}
                </Badge>
              </Stack>
              
              <fetcher.Form method="post">
                <input type="hidden" name="action" value="toggle-status" />
                <Button
                  submit
                  variant={shop?.tryOnEnabled ? "secondary" : "primary"}
                  tone={shop?.tryOnEnabled ? "critical" : "success"}
                >
                  {shop?.tryOnEnabled ? "Disable Try-On" : "Enable Try-On"}
                </Button>
              </fetcher.Form>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h3">
              Recent Try-On Requests
            </Text>
            {recentRequests.length > 0 ? (
              <ResourceList
                resourceName={{ singular: 'request', plural: 'requests' }}
                items={recentRequests}
                renderItem={(request: any) => {
                  const { id, productTitle, status, createdAt } = request;
                  const statusBadge = status === 'completed' ? 'success' : 
                                    status === 'failed' ? 'critical' : 'info';

                  return (
                    <ResourceItem id={id} key={id}>
                      <Stack alignment="center" distribution="fillEvenly">
                        <Thumbnail
                          source="https://via.placeholder.com/50x50/007acc/ffffff?text=TryOn"
                          alt={productTitle}
                          size="small"
                        />
                        <div>
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {productTitle}
                          </Text>
                          <Text variant="bodySm" as="p" color="subdued">
                            {new Date(createdAt).toLocaleDateString()}
                          </Text>
                        </div>
                        <Badge status={statusBadge}>{status}</Badge>
                      </Stack>
                    </ResourceItem>
                  );
                }}
              />
            ) : (
              <Banner>
                <p>No try-on requests yet. Install the widget on your product pages to get started!</p>
              </Banner>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}