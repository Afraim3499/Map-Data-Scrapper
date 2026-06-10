import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    const activeStatuses = ['queued', 'discovering_places', 'deduplicating', 'fetching_details', 'scanning_websites', 'scoring_leads'];
    if (!activeStatuses.includes(campaign.status)) {
      return NextResponse.json({ error: `Campaign is not in an active state: ${campaign.status}` }, { status: 400 });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'paused' },
    });

    await prisma.log.create({
      data: {
        campaignId: id,
        level: 'info',
        message: 'Campaign paused by operator.',
      },
    });

    return NextResponse.json({ success: true, message: 'Campaign paused successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to pause campaign' }, { status: 500 });
  }
}
