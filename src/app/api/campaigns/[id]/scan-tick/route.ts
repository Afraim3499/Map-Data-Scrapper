import { NextResponse } from 'next/server';
import { processCampaignTick } from '@/lib/services/queue';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await processCampaignTick(id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process campaign tick' }, { status: 500 });
  }
}
