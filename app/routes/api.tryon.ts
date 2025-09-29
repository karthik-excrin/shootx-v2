import { ActionFunctionArgs, json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ComfyUIRequest {
  prompt: {
    [key: string]: {
      inputs: {
        [key: string]: any;
      };
      class_type: string;
    };
  };
}

interface ComfyUIResponse {
  prompt_id: string;
  number: number;
  node_errors: any;
}

async function callComfyUI(customerImage: string, garmentImage: string): Promise<string> {
  const RUNPOD_API_URL = process.env.RUNPOD_API_URL;
  const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

  if (!RUNPOD_API_URL || !RUNPOD_API_KEY) {
    throw new Error('RunPod API configuration is missing');
  }

  // ComfyUI workflow for virtual try-on
  const workflow: ComfyUIRequest = {
    prompt: {
      "1": {
        inputs: {
          image: customerImage,
          upload: "image"
        },
        class_type: "LoadImage"
      },
      "2": {
        inputs: {
          image: garmentImage,
          upload: "image"
        },
        class_type: "LoadImage"
      },
      "3": {
        inputs: {
          person_image: ["1", 0],
          garment_image: ["2", 0],
          seed: Math.floor(Math.random() * 1000000),
          steps: 20,
          cfg: 7.0,
          sampler_name: "euler",
          scheduler: "normal",
          denoise: 1.0
        },
        class_type: "VirtualTryOnNode"
      },
      "4": {
        inputs: {
          images: ["3", 0],
          filename_prefix: "tryon_result"
        },
        class_type: "SaveImage"
      }
    }
  };

  try {
    // Submit the workflow to ComfyUI
    const response = await fetch(`${RUNPOD_API_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify(workflow),
    });

    if (!response.ok) {
      throw new Error(`ComfyUI API error: ${response.statusText}`);
    }

    const result: ComfyUIResponse = await response.json();
    
    // Poll for completion
    const resultImageUrl = await pollForResult(result.prompt_id, RUNPOD_API_URL, RUNPOD_API_KEY);
    
    return resultImageUrl;
  } catch (error) {
    console.error('ComfyUI API error:', error);
    throw new Error('Failed to generate try-on result');
  }
}

async function pollForResult(promptId: string, apiUrl: string, apiKey: string): Promise<string> {
  const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute max
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${apiUrl}/history/${promptId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const history = await response.json();
        
        if (history[promptId] && history[promptId].status?.completed) {
          // Get the output images
          const outputs = history[promptId].outputs;
          if (outputs && outputs["4"] && outputs["4"].images) {
            const imageName = outputs["4"].images[0].filename;
            return `${apiUrl}/view?filename=${imageName}`;
          }
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Try-on generation timed out');
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const shopDomain = formData.get('shop') as string;
    const productId = formData.get('productId') as string;
    const productTitle = formData.get('productTitle') as string;
    const productImage = formData.get('productImage') as string;
    const customerImage = formData.get('customerImage') as string;

    if (!shopDomain || !productId || !productTitle || !productImage || !customerImage) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the shop
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
    });

    if (!shop || !shop.tryOnEnabled) {
      return json({ error: 'Try-on service not available' }, { status: 403 });
    }

    // Create try-on request record
    const tryOnRequest = await prisma.tryOnRequest.create({
      data: {
        shopId: shop.shopId,
        productId,
        productTitle,
        customerImage,
        productImage,
        status: 'processing',
      },
    });

    // Process the try-on in the background
    processeTryOnAsync(tryOnRequest.id, customerImage, productImage);

    return json({
      success: true,
      requestId: tryOnRequest.id,
      message: 'Try-on request submitted successfully',
    });

  } catch (error) {
    console.error('Try-on API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// Process try-on asynchronously
async function processeTryOnAsync(requestId: string, customerImage: string, productImage: string) {
  try {
    const resultImageUrl = await callComfyUI(customerImage, productImage);
    
    await prisma.tryOnRequest.update({
      where: { id: requestId },
      data: {
        resultImage: resultImageUrl,
        status: 'completed',
      },
    });
  } catch (error) {
    console.error('Try-on processing error:', error);
    
    await prisma.tryOnRequest.update({
      where: { id: requestId },
      data: {
        status: 'failed',
      },
    });
  }
}