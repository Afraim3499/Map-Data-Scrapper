import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exportCampaignLeads } from '@/lib/services/exporter';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const dbExport = await prisma.export.findUnique({ where: { id } });
    if (!dbExport) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    // Generate the CSV content on the fly
    const { csvContent } = await exportCampaignLeads(dbExport.campaignId, dbExport.exportType);

    // Return downloadable response
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${dbExport.fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to download export' }, { status: 500 });
  }
}
