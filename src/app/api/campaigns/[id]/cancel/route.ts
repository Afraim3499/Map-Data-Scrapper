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

    await prisma.campaign.update({
      where: { id },
      data: { status: 'cancelled', updatedAt: new Date() },
    });

    // Mark active jobs as cancelled
    await prisma.job.updateMany({
      where: { campaignId: id, status: { in: ['pending', 'processing'] } },
      data: { status: 'cancelled', completedAt: new Date() },
    });

    await prisma.log.create({
      data: {
        campaignId: id,
        level: 'info',
        message: 'Campaign cancelled by operator.',
      },
    });

    return NextResponse.json({ success: true, message: 'Campaign cancelled successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to cancel campaign' }, { status: 500 });
  }
}
