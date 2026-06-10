import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { scanWebsite } from '@/lib/services/scanner';
import { calculateLeadScore } from '@/lib/services/scoring';

export async function POST(
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

    // Crawl site
    const scanResult = await scanWebsite(lead.website, lead.id, lead.campaignId);

    // Save scan
    const existingScan = lead.websiteScans[0];
    if (existingScan) {
      await prisma.websiteScan.delete({ where: { id: existingScan.id } });
    }

    const newScan = await prisma.websiteScan.create({
      data: {
        leadId: lead.id,
        scanStatus: scanResult.scanStatus,
        httpStatus: scanResult.httpStatus,
        finalUrl: scanResult.finalUrl,
        homepageTitle: scanResult.homepageTitle,
        pagesScanned: scanResult.pagesScanned,
        appointmentPageFound: scanResult.appointmentPageFound,
        appointmentUrl: scanResult.appointmentUrl,
        contactPageFound: scanResult.contactPageFound,
        contactUrl: scanResult.contactUrl,
        bookingFlowStrength: scanResult.bookingFlowStrength,
        textCapability: scanResult.textCapability,
        textEvidence: scanResult.textEvidence,
        chatWidgetFound: scanResult.chatWidgetFound,
        chatWidgetName: scanResult.chatWidgetName,
        formFound: scanResult.formFound,
        formType: scanResult.formType,
        detectedSoftware: scanResult.detectedSoftware,
        softwareConfidence: scanResult.softwareConfidence,
        softwareEvidence: scanResult.softwareEvidence,
        evidenceUrl: scanResult.evidenceUrl,
        rawSignalsJson: scanResult.rawSignalsJson,
      },
    });

    // Recalculate score
    const newScore = calculateLeadScore(lead, newScan);

    const existingScore = lead.leadScores[0];
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

    await prisma.log.create({
      data: {
        campaignId: lead.campaignId,
        leadId: lead.id,
        level: 'info',
        message: `Manual website rescan completed for lead "${lead.businessName}". Software: ${newScan.detectedSoftware || 'None'}, Grade: ${newScore.leadGrade}.`,
      },
    });

    return NextResponse.json({ success: true, scan: newScan, score: newScore });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to rescan website' }, { status: 500 });
  }
}
