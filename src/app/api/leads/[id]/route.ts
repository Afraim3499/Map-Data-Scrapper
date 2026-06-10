import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateLeadScore } from '@/lib/services/scoring';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        websiteScans: true,
        leadScores: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...lead,
      score: lead.leadScores[0] || null,
      scan: lead.websiteScans[0] || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    
    // Whitelist editable fields
    const {
      businessName,
      phoneFormatted,
      phoneRaw,
      website,
      address,
      city,
      state,
      zip,
      rating,
      reviewCount,
      closesBefore6,
      closedSaturday,
      closedSunday,
      weekdayCloseTime,
      hoursSummary,
    } = body;

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        businessName: businessName !== undefined ? businessName : undefined,
        phoneFormatted: phoneFormatted !== undefined ? phoneFormatted : undefined,
        phoneRaw: phoneRaw !== undefined ? phoneRaw : undefined,
        website: website !== undefined ? website : undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
        state: state !== undefined ? state : undefined,
        zip: zip !== undefined ? zip : undefined,
        rating: rating !== undefined ? (rating !== null ? Number(rating) : null) : undefined,
        reviewCount: reviewCount !== undefined ? (reviewCount !== null ? Number(reviewCount) : null) : undefined,
        closesBefore6: closesBefore6 !== undefined ? Boolean(closesBefore6) : undefined,
        closedSaturday: closedSaturday !== undefined ? Boolean(closedSaturday) : undefined,
        closedSunday: closedSunday !== undefined ? Boolean(closedSunday) : undefined,
        weekdayCloseTime: weekdayCloseTime !== undefined ? weekdayCloseTime : undefined,
        hoursSummary: hoursSummary !== undefined ? hoursSummary : undefined,
      },
      include: {
        websiteScans: true,
        leadScores: true,
      },
    });

    // After updating a lead, we should recalculate its score!
    const scan = updatedLead.websiteScans[0] || {};
    const newScore = calculateLeadScore(updatedLead, scan);

    const existingScore = updatedLead.leadScores[0];
    if (existingScore) {
      await prisma.leadScore.update({
        where: { id: existingScore.id },
        data: {
          torqiFitScore: newScore.torqiFitScore,
          leadGrade: newScore.leadGrade,
          dataConfidenceScore: newScore.dataConfidenceScore,
          primaryBucket: newScore.primaryBucket,
          secondaryBuckets: newScore.secondaryBuckets,
          salesHook: newScore.salesHook,
          openingLine: newScore.openingLine,
          outreachPriority: newScore.outreachPriority,
          scoreBreakdownJson: newScore.scoreBreakdownJson,
        },
      });
    }

    // Refetch and return fully updated profile
    const finalLead = await prisma.lead.findUnique({
      where: { id },
      include: {
        websiteScans: true,
        leadScores: true,
      },
    });

    return NextResponse.json({
      ...finalLead,
      score: finalLead?.leadScores[0] || null,
      scan: finalLead?.websiteScans[0] || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}
