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
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Run batch scan in background
    (async () => {
      await prisma.campaign.update({
        where: { id },
        data: { status: 'scanning_websites', updatedAt: new Date() },
      });

      const leads = await prisma.lead.findMany({
        where: { campaignId: id },
        include: { websiteScans: true, leadScores: true },
      });

      await prisma.log.create({
        data: {
          campaignId: id,
          level: 'info',
          message: `Manual batch website crawl started for ${leads.length} leads in background.`,
        },
      });

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        
        // Skip if cancelled/paused
        const currentCampaign = await prisma.campaign.findUnique({ where: { id } });
        if (currentCampaign?.status === 'paused' || currentCampaign?.status === 'cancelled') {
          break;
        }

        const scanResult = await scanWebsite(lead.website, lead.id, id);

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

        // Update score
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

        // Update progress counter
        await prisma.campaign.update({
          where: { id },
          data: { totalScanned: i + 1 },
        });
      }

      // Restore complete status
      await prisma.campaign.update({
        where: { id },
        data: { status: 'complete', updatedAt: new Date() },
      });

      await prisma.log.create({
        data: {
          campaignId: id,
          level: 'info',
          message: 'Manual batch website crawl completed successfully.',
        },
      });
    })().catch(err => {
      console.error('Batch crawl background error:', err);
    });

    return NextResponse.json({ success: true, message: 'Batch website scan started in background.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to start website scans' }, { status: 500 });
  }
}
