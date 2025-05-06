import { NextRequest } from 'next/server';
import { ragChain } from '@/lib/rag-chain';

interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json() as ChatRequest;
    
    const result = await ragChain.invoke({
      query: message,
      history: history || []
    });

    return Response.json({
      success: true,
      response: result.result
    });
  } catch (error) {
    console.error('Chat API error:', error instanceof Error ? error.message : String(error));
    return Response.json({
      success: false,
      error: 'Failed to process query',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}