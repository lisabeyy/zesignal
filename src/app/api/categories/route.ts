import { NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

export async function GET() {
  try {
    const categories = await mcpClient.getCoinCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}