import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exportCampaignLeads } from '@/lib/services/exporter';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await params;

  try {
    const { fileName, rowCount } = await exportCampaignLeads(id, type);

    const dbExport = await prisma.export.create({
      data: {
        campaignId: id,
        exportType: type,
        fileName,
        filePath: `dynamic-on-the-fly`,
        rowCount,
      },
    });

    // Also add to campaign logs
    await prisma.log.create({
      data: {
        campaignId: id,
        level: 'info',
        message: `Generated CSV export: "${fileName}" with ${rowCount} rows (Format: ${type}).`,
      },
    });

    return NextResponse.json(dbExport);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate export' }, { status: 500 });
  }
}
