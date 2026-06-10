import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get logs for this campaign
    const logs = await prisma.log.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // Count statistics
    const leadCount = await prisma.lead.count({ where: { campaignId: id } });
    
    // Count qualified (Grade A or B)
    const qualifiedCount = await prisma.lead.count({
      where: {
        campaignId: id,
        leadScores: {
          some: {
            leadGrade: { in: ['A', 'B'] }
          }
        }
      }
    });

    // Count of after-hours opportunities
    const afterHoursCount = await prisma.lead.count({
      where: {
        campaignId: id,
        afterHoursGap: true
      }
    });

    // Count of software signals
    const softwareCount = await prisma.lead.count({
      where: {
        campaignId: id,
        websiteScans: {
          some: {
            detectedSoftware: { not: null }
          }
        }
      }
    });

    return NextResponse.json({
      campaign,
      logs,
      stats: {
        leads: leadCount,
        qualified: qualifiedCount,
        afterHours: afterHoursCount,
        softwareSignals: softwareCount,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch campaign details' }, { status: 500 });
  }
}
