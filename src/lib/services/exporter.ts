import { prisma } from '../db';

export function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // If value contains quotes, commas, or newlines, escape quotes by doubling them and wrap in double quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSVValue).join(',');
  const rowLines = rows.map(row => row.map(escapeCSVValue).join(','));
  return [headerLine, ...rowLines].join('\n');
}

export async function exportCampaignLeads(campaignId: string, exportType: string): Promise<{ csvContent: string; fileName: string; rowCount: number }> {
  // Fetch campaign info
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  // Fetch leads with scans and scores
  const leads = await prisma.lead.findMany({
    where: { campaignId },
    include: {
      websiteScans: true,
      leadScores: true,
    },
    orderBy: {
      leadScores: {
        _count: 'desc', // fallback, let's sort by rating/name
      },
    },
  });

  // Since prisma include can return array, let's grab first scan/score
  const formattedLeads = leads.map(lead => {
    const scan = lead.websiteScans[0] || {};
    const score = lead.leadScores[0] || {};
    return {
      lead,
      scan,
      score,
    };
  });

  let headers: string[] = [];
  let rows: string[][] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeCampaignName = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const fileName = `torqi_export_${safeCampaignName}_${exportType}_${timestamp}.csv`;

  switch (exportType) {
    case 'full':
      headers = [
        'Place ID', 'Business Name', 'Phone Raw', 'Phone Formatted', 'Website',
        'Address', 'City', 'State', 'ZIP', 'Latitude', 'Longitude', 'Google Maps URL',
        'Business Status', 'Rating', 'Review Count', 'Primary Type', 'Types',
        'Weekday Close Time', 'Closed Saturday', 'Closed Sunday', 'Closes Before 6', 'After-Hours Gap',
        'Scan Status', 'HTTP Status', 'Final URL', 'Homepage Title', 'Pages Scanned',
        'Appointment Page Found', 'Appointment URL', 'Contact Page Found', 'Contact URL',
        'Booking Flow Strength', 'Text Capability', 'Text Evidence', 'Chat Widget Found', 'Chat Widget Name',
        'Form Found', 'Form Type', 'Detected Software', 'Software Confidence', 'Software Evidence', 'Evidence URL',
        'TorQi Fit Score', 'Lead Grade', 'Data Confidence Score', 'Primary Bucket', 'Secondary Buckets',
        'Sales Hook', 'Opening Line', 'Outreach Priority',
        'Owner Name', 'Rude Staff Mentioned', 'No Pick Up Mentioned'
      ];
      rows = formattedLeads.map(({ lead, scan, score }) => [
        lead.placeId, lead.businessName, lead.phoneRaw || '', lead.phoneFormatted || '', lead.website || '',
        lead.address || '', lead.city || '', lead.state || '', lead.zip || '', lead.latitude?.toString() || '', lead.longitude?.toString() || '', lead.googleMapsUrl || '',
        lead.businessStatus || '', lead.rating?.toString() || '', lead.reviewCount?.toString() || '', lead.primaryType || '', lead.types || '',
        lead.weekdayCloseTime || '', lead.closedSaturday ? 'Yes' : 'No', lead.closedSunday ? 'Yes' : 'No', lead.closesBefore6 ? 'Yes' : 'No', lead.afterHoursGap ? 'Yes' : 'No',
        scan.scanStatus || 'not_started', scan.httpStatus?.toString() || '', scan.finalUrl || '', scan.homepageTitle || '', scan.pagesScanned?.toString() || '0',
        scan.appointmentPageFound ? 'Yes' : 'No', scan.appointmentUrl || '', scan.contactPageFound ? 'Yes' : 'No', scan.contactUrl || '',
        scan.bookingFlowStrength || '', scan.textCapability || '', scan.textEvidence || '', scan.chatWidgetFound ? 'Yes' : 'No', scan.chatWidgetName || '',
        scan.formFound ? 'Yes' : 'No', scan.formType || '', scan.detectedSoftware || '', scan.softwareConfidence || '', scan.softwareEvidence || '', scan.evidenceUrl || '',
        score.torqiFitScore?.toString() || '0', score.leadGrade || 'D', score.dataConfidenceScore?.toString() || '0', score.primaryBucket || '', score.secondaryBuckets || '',
        score.salesHook || '', score.openingLine || '', score.outreachPriority || 'Low',
        lead.ownerName || '', lead.rudeStaffMentioned ? 'Yes' : 'No', lead.noPickUpMentioned ? 'Yes' : 'No'
      ]);
      break;

    case 'sales':
      headers = [
        'Business Name', 'Phone Number', 'Website', 'City', 'State', 'Rating', 'Review Count',
        'Hours Summary', 'Closes At', 'Closed Weekends', 'Owner Name', 'Rude Staff Mentioned', 'No Pick Up Mentioned',
        'Primary Bucket', 'TorQi Fit Score', 'Lead Grade', 'Software Detected', 'Sales Hook', 'Opening Line', 'Evidence', 'Google Maps URL'
      ];
      rows = formattedLeads.map(({ lead, scan, score }) => {
        const closedWeekends = lead.closedSaturday && lead.closedSunday ? 'Yes' : (lead.closedSaturday || lead.closedSunday ? 'Partial' : 'No');
        const evidence = scan.softwareEvidence || scan.textEvidence || 'No digital signals detected.';
        return [
          lead.businessName, lead.phoneFormatted || lead.phoneRaw || '', lead.website || '', lead.city || '', lead.state || '', lead.rating?.toString() || '', lead.reviewCount?.toString() || '',
          lead.hoursSummary || '', lead.weekdayCloseTime || '', closedWeekends, lead.ownerName || '', lead.rudeStaffMentioned ? 'Yes' : 'No', lead.noPickUpMentioned ? 'Yes' : 'No',
          score.primaryBucket || '', score.torqiFitScore?.toString() || '0',
          score.leadGrade || 'D', scan.detectedSoftware || 'None', score.salesHook || '', score.openingLine || '', evidence, lead.googleMapsUrl || ''
        ];
      });
      break;

    case 'crm':
      headers = [
        'Company Name', 'Phone', 'Website', 'Address', 'City', 'State', 'ZIP',
        'Lead Source', 'Lead Category', 'Lead Score', 'Lead Grade', 'Primary Pain Point',
        'Detected Software', 'Notes', 'Owner', 'Status', 'Rude Staff Mentioned', 'No Pick Up Mentioned'
      ];
      rows = formattedLeads.map(({ lead, scan, score }) => [
        lead.businessName, lead.phoneFormatted || lead.phoneRaw || '', lead.website || '', lead.address || '', lead.city || '', lead.state || '', lead.zip || '',
        'TorQi Territory Builder', campaign.businessCategory, score.torqiFitScore?.toString() || '0', score.leadGrade || 'D', score.primaryBucket || 'Unknown Gaps',
        scan.detectedSoftware || 'None', score.salesHook || 'Lead discovered during territory building scan.', lead.ownerName || '', 'New',
        lead.rudeStaffMentioned ? 'Yes' : 'No', lead.noPickUpMentioned ? 'Yes' : 'No'
      ]);
      break;

    case 'software-fit':
      // Filter only leads that have software detected
      const softwareLeads = formattedLeads.filter(l => l.scan.detectedSoftware);
      headers = [
        'Business Name', 'Phone', 'Website', 'Detected Software', 'Confidence',
        'Evidence URL', 'Evidence Text', 'Rating', 'Review Count', 'Sales Hook'
      ];
      rows = softwareLeads.map(({ lead, scan, score }) => [
        lead.businessName, lead.phoneFormatted || lead.phoneRaw || '', lead.website || '', scan.detectedSoftware || '', scan.softwareConfidence || 'Medium',
        scan.evidenceUrl || '', scan.softwareEvidence || '', lead.rating?.toString() || '', lead.reviewCount?.toString() || '', score.salesHook || ''
      ]);
      break;

    case 'after-hours':
      // Filter only leads that have after-hours gap
      const afterHoursLeads = formattedLeads.filter(l => l.lead.afterHoursGap);
      headers = [
        'Business Name', 'Phone', 'Website', 'Weekday Closing Time', 'Saturday Status',
        'Sunday Status', 'After-Hours Gap Type', 'TorQi Hook'
      ];
      rows = afterHoursLeads.map(({ lead, scan, score }) => {
        let gapType = 'Standard Hours';
        if (lead.closesBefore6 && lead.closedSaturday && lead.closedSunday) gapType = 'Early Close & Closed Weekends';
        else if (lead.closesBefore6) gapType = 'Closes Before 6 PM';
        else if (lead.closedSaturday || lead.closedSunday) gapType = 'Closed Weekends';
        
        return [
          lead.businessName, lead.phoneFormatted || lead.phoneRaw || '', lead.website || '', lead.weekdayCloseTime || '',
          lead.closedSaturday ? 'Closed' : 'Open', lead.closedSunday ? 'Closed' : 'Open', gapType, score.salesHook || ''
        ];
      });
      break;

    default:
      throw new Error(`Unsupported export type: ${exportType}`);
  }

  const csvContent = generateCSV(headers, rows);
  return {
    csvContent,
    fileName,
    rowCount: rows.length,
  };
}
