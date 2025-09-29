import { LoaderFunctionArgs, ActionFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Button,
  Text,
  Stack,
  Banner,
  Select,
  RangeSlider,
  ColorPicker,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { PrismaClient } from "@prisma/client";
import { useState, useCallback } from "react";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: session.shop },
  });

  return json({ shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settings = {
    tryOnEnabled: formData.get("tryOnEnabled") === "true",
    buttonText: formData.get("buttonText") as string,
    buttonColor: formData.get("buttonColor") as string,
    popupTitle: formData.get("popupTitle") as string,
    maxFileSize: parseInt(formData.get("maxFileSize") as string),
    allowedFileTypes: formData.get("allowedFileTypes") as string,
  };

  await prisma.shop.upsert({
    where: { shopDomain: session.shop },
    update: settings,
    create: {
      ...settings,
      shopId: session.shop.replace('.myshopify.com', ''),
      shopDomain: session.shop,
    },
  });

  return json({ success: true, message: "Settings saved successfully!" });
};

export default function Settings() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const [tryOnEnabled, setTryOnEnabled] = useState(shop?.tryOnEnabled ?? true);
  const [buttonText, setButtonText] = useState(shop?.buttonText || "Try On");
  const [buttonColor, setButtonColor] = useState({
    hex: shop?.buttonColor || "#007acc",
    hsb: { hue: 0, saturation: 0, brightness: 0 },
    alpha: 1,
  });
  const [popupTitle, setPopupTitle] = useState(shop?.popupTitle || "Virtual Try-On");
  const [maxFileSize, setMaxFileSize] = useState((shop?.maxFileSize || 5242880) / 1048576); // Convert to MB
  const [fileTypes, setFileTypes] = useState(shop?.allowedFileTypes || "image/jpeg,image/png,image/webp");

  const handleColorChange = useCallback((color: any) => {
    setButtonColor(color);
  }, []);

  const isLoading = fetcher.state === "submitting";
  const isSuccess = fetcher.data?.success;

  const fileTypeOptions = [
    { label: 'JPEG, PNG, WebP', value: 'image/jpeg,image/png,image/webp' },
    { label: 'JPEG, PNG', value: 'image/jpeg,image/png' },
    { label: 'PNG only', value: 'image/png' },
  ];

  return (
    <Page title="ShootX Settings">
      <Layout>
        <Layout.Section>
          {isSuccess && (
            <Banner tone="success" title="Success">
              {fetcher.data?.message}
            </Banner>
          )}
          
          <Card>
            <Text variant="headingMd" as="h2">
              General Settings
            </Text>
            <Divider />
            
            <fetcher.Form method="post">
              <FormLayout>
                <Checkbox
                  label="Enable Virtual Try-On"
                  checked={tryOnEnabled}
                  onChange={setTryOnEnabled}
                  helpText="Turn on/off the try-on functionality for your store"
                />
                <input type="hidden" name="tryOnEnabled" value={tryOnEnabled.toString()} />

                <TextField
                  label="Button Text"
                  value={buttonText}
                  onChange={setButtonText}
                  helpText="Text displayed on the try-on button"
                />
                <input type="hidden" name="buttonText" value={buttonText} />

                <div>
                  <Text variant="bodyMd" as="label">
                    Button Color
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    <ColorPicker color={buttonColor} onChange={handleColorChange} />
                  </div>
                  <Text variant="bodySm" as="p" color="subdued">
                    Choose the color for your try-on button
                  </Text>
                </div>
                <input type="hidden" name="buttonColor" value={buttonColor.hex} />

                <TextField
                  label="Popup Title"
                  value={popupTitle}
                  onChange={setPopupTitle}
                  helpText="Title shown in the try-on popup"
                />
                <input type="hidden" name="popupTitle" value={popupTitle} />

                <div>
                  <RangeSlider
                    label={`Maximum File Size: ${maxFileSize}MB`}
                    value={maxFileSize}
                    onChange={setMaxFileSize}
                    min={1}
                    max={10}
                    step={1}
                    helpText="Maximum allowed file size for uploaded images"
                  />
                </div>
                <input type="hidden" name="maxFileSize" value={(maxFileSize * 1048576).toString()} />

                <Select
                  label="Allowed File Types"
                  options={fileTypeOptions}
                  value={fileTypes}
                  onChange={setFileTypes}
                  helpText="Supported image formats for uploads"
                />
                <input type="hidden" name="allowedFileTypes" value={fileTypes} />

                <Stack distribution="trailing">
                  <Button variant="primary" submit loading={isLoading}>
                    {isLoading ? "Saving..." : "Save Settings"}
                  </Button>
                </Stack>
              </FormLayout>
            </fetcher.Form>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card>
            <Stack vertical spacing="loose">
              <Text variant="headingMd" as="h3">
                Installation Instructions
              </Text>
              
              <Text variant="bodyMd" as="p">
                The ShootX widget will automatically appear on your product pages once enabled. 
                The try-on button will be added near the "Add to Cart" button.
              </Text>

              <div style={{ 
                backgroundColor: '#f6f6f7', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #e1e3e5'
              }}>
                <Text variant="bodySm" as="p" color="subdued">
                  <strong>Preview:</strong> Your try-on button will look like this:
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <button style={{
                    backgroundColor: buttonColor.hex,
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    {buttonText}
                  </button>
                </div>
              </div>
            </Stack>
          </Card>

          <Card>
            <Stack vertical spacing="loose">
              <Text variant="headingMd" as="h3">
                API Configuration
              </Text>
              
              <Banner tone="info">
                <p>
                  ShootX uses ComfyUI on RunPod for AI-powered virtual try-on generation. 
                  Configure your RunPod endpoint in the environment variables.
                </p>
              </Banner>
              
              <Text variant="bodyMd" as="p">
                Required environment variables:
              </Text>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li><code>RUNPOD_API_URL</code> - Your RunPod ComfyUI endpoint</li>
                <li><code>RUNPOD_API_KEY</code> - Your RunPod API key</li>
              </ul>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}