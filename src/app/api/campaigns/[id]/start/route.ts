import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { queueCampaignJob } from '@/lib/services/queue';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'failed') {
      return NextResponse.json({ error: `Campaign cannot be started from state: ${campaign.status}` }, { status: 400 });
    }

    await queueCampaignJob(id);

    return NextResponse.json({ success: true, message: 'Campaign started in background.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to start campaign' }, { status: 500 });
  }
}
