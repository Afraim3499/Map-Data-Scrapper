import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exportCampaignLeads } from '@/lib/services/exporter';
import fs from 'fs';
import path from 'path';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await params;

  try {
    const { csvContent, fileName, rowCount } = await exportCampaignLeads(id, type);

    // Save to public/exports/ folder
    const exportsDir = path.join(process.cwd(), 'public', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    const fullPath = path.join(exportsDir, fileName);
    fs.writeFileSync(fullPath, csvContent, 'utf-8');

    const dbExport = await prisma.export.create({
      data: {
        campaignId: id,
        exportType: type,
        fileName,
        filePath: `/exports/${fileName}`,
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
