import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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

    const fullPath = path.join(process.cwd(), 'public', dbExport.filePath);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'CSV file not found on disk' }, { status: 404 });
    }

    const csvContent = fs.readFileSync(fullPath, 'utf-8');

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
