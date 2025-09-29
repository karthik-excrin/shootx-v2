import { LoaderFunctionArgs, json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const requestId = url.searchParams.get('requestId');

  if (!requestId) {
    return json({ error: 'Request ID is required' }, { status: 400 });
  }

  try {
    const tryOnRequest = await prisma.tryOnRequest.findUnique({
      where: { id: requestId },
    });

    if (!tryOnRequest) {
      return json({ error: 'Request not found' }, { status: 404 });
    }

    return json({
      status: tryOnRequest.status,
      resultImage: tryOnRequest.resultImage,
      createdAt: tryOnRequest.createdAt,
      updatedAt: tryOnRequest.updatedAt,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};