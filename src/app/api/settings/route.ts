import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const settings = await prisma.setting.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        googleMapsApiKey: '',
        maxZipsPerCampaign: 10,
        maxQueriesPerZip: 5,
        maxWebsitesScannedPerMinute: 10,
        websiteTimeoutSeconds: 15,
        enableJsScanDefault: false,
        defaultExportFormat: 'sales',
        excludedDomains: 'facebook.com,yelp.com,youtube.com,instagram.com,twitter.com',
        excludedBusinessNames: 'AutoZone,O\'Reilly,Advance Auto,Pep Boys,NAPA Auto Parts',
        excludedBusinessStatuses: 'CLOSED_PERMANENTLY',
      },
    });

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    // Whitelist only editable settings
    const {
      googleMapsApiKey,
      maxZipsPerCampaign,
      maxQueriesPerZip,
      maxWebsitesScannedPerMinute,
      websiteTimeoutSeconds,
      enableJsScanDefault,
      defaultExportFormat,
      excludedDomains,
      excludedBusinessNames,
      excludedBusinessStatuses,
    } = body;

    const updated = await prisma.setting.update({
      where: { id: 'default' },
      data: {
        googleMapsApiKey: googleMapsApiKey !== undefined ? googleMapsApiKey : undefined,
        maxZipsPerCampaign: maxZipsPerCampaign !== undefined ? Number(maxZipsPerCampaign) : undefined,
        maxQueriesPerZip: maxQueriesPerZip !== undefined ? Number(maxQueriesPerZip) : undefined,
        maxWebsitesScannedPerMinute: maxWebsitesScannedPerMinute !== undefined ? Number(maxWebsitesScannedPerMinute) : undefined,
        websiteTimeoutSeconds: websiteTimeoutSeconds !== undefined ? Number(websiteTimeoutSeconds) : undefined,
        enableJsScanDefault: enableJsScanDefault !== undefined ? Boolean(enableJsScanDefault) : undefined,
        defaultExportFormat: defaultExportFormat !== undefined ? defaultExportFormat : undefined,
        excludedDomains: excludedDomains !== undefined ? excludedDomains : undefined,
        excludedBusinessNames: excludedBusinessNames !== undefined ? excludedBusinessNames : undefined,
        excludedBusinessStatuses: excludedBusinessStatuses !== undefined ? excludedBusinessStatuses : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
