import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list campaigns' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, state, businessCategory, searchQueries } = body;

    if (!name || !state || !businessCategory || !searchQueries) {
      return NextResponse.json({ error: 'Missing required fields: name, state, businessCategory, searchQueries' }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        state,
        businessCategory,
        searchQueries,
        status: 'draft',
      },
    });

    // Create log
    await prisma.log.create({
      data: {
        campaignId: campaign.id,
        level: 'info',
        message: `Campaign "${name}" created as draft. State: ${state}, Category: ${businessCategory}.`,
      },
    });

    return NextResponse.json(campaign);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 500 });
  }
}
