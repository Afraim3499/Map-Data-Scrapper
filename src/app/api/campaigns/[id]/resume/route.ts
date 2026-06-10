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

    if (campaign.status !== 'paused' && campaign.status !== 'failed') {
      return NextResponse.json({ error: `Campaign cannot be resumed from state: ${campaign.status}` }, { status: 400 });
    }

    await queueCampaignJob(id);

    await prisma.log.create({
      data: {
        campaignId: id,
        level: 'info',
        message: 'Campaign resumed by operator. Restarting background worker.',
      },
    });

    return NextResponse.json({ success: true, message: 'Campaign resumed in background.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to resume campaign' }, { status: 500 });
  }
}
