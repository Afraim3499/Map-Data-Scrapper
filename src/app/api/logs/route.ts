import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const logs = await prisma.log.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Extract unique campaign IDs
    const campaignIds = Array.from(
      new Set(logs.map((l) => l.campaignId).filter(Boolean))
    ) as string[];

    // Fetch matching campaign names
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, name: true },
    });

    // Create a map of campaign ID to name
    const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));

    // Append campaign name object to logs
    const formattedLogs = logs.map((l) => ({
      ...l,
      campaign: l.campaignId
        ? { name: campaignMap.get(l.campaignId) || 'Unknown' }
        : undefined,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
