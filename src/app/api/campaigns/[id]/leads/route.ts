import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  
  const search = searchParams.get('search') || '';
  const grade = searchParams.get('grade') || '';
  const bucket = searchParams.get('bucket') || '';
  const software = searchParams.get('software') || '';
  const sort = searchParams.get('sort') || 'score_desc';

  try {
    // Fetch all leads for campaign (excluding heavy reviewsJson and hoursJson to prevent timeouts)
    const leads = await prisma.lead.findMany({
      where: { campaignId: id },
      select: {
        id: true,
        campaignId: true,
        placeId: true,
        businessName: true,
        phoneRaw: true,
        phoneFormatted: true,
        website: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        latitude: true,
        longitude: true,
        googleMapsUrl: true,
        businessStatus: true,
        rating: true,
        reviewCount: true,
        primaryType: true,
        types: true,
        hoursSummary: true,
        closesBefore6: true,
        closedSaturday: true,
        closedSunday: true,
        createdAt: true,
        updatedAt: true,
        leadScores: true,
        websiteScans: true,
      },
    });

    // Format and map
    let filteredLeads = leads.map(l => ({
      ...l,
      score: l.leadScores[0] || null,
      scan: l.websiteScans[0] || null,
    }));

    // In-memory filter
    if (search) {
      const s = search.toLowerCase();
      filteredLeads = filteredLeads.filter(l => 
        l.businessName.toLowerCase().includes(s) ||
        (l.phoneRaw && l.phoneRaw.includes(s)) ||
        (l.phoneFormatted && l.phoneFormatted.includes(s)) ||
        (l.zip && l.zip.includes(s)) ||
        (l.city && l.city.toLowerCase().includes(s))
      );
    }

    if (grade) {
      const grades = grade.split(',');
      filteredLeads = filteredLeads.filter(l => l.score && grades.includes(l.score.leadGrade));
    }

    if (bucket) {
      filteredLeads = filteredLeads.filter(l => l.score && l.score.primaryBucket === bucket);
    }

    if (software) {
      if (software === 'none') {
        filteredLeads = filteredLeads.filter(l => !l.scan || !l.scan.detectedSoftware);
      } else {
        filteredLeads = filteredLeads.filter(l => l.scan && l.scan.detectedSoftware === software);
      }
    }

    // In-memory sort
    filteredLeads.sort((a, b) => {
      const scoreA = a.score?.torqiFitScore ?? 0;
      const scoreB = b.score?.torqiFitScore ?? 0;
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      const reviewsA = a.reviewCount ?? 0;
      const reviewsB = b.reviewCount ?? 0;
      const nameA = a.businessName.toLowerCase();
      const nameB = b.businessName.toLowerCase();

      switch (sort) {
        case 'score_desc': return scoreB - scoreA;
        case 'score_asc': return scoreA - scoreB;
        case 'name_asc': return nameA.localeCompare(nameB);
        case 'name_desc': return nameB.localeCompare(nameA);
        case 'rating_desc': return ratingB - ratingA;
        case 'rating_asc': return ratingA - ratingB;
        case 'reviews_desc': return reviewsB - reviewsA;
        case 'reviews_asc': return reviewsA - reviewsB;
        default: return scoreB - scoreA;
      }
    });

    return NextResponse.json(filteredLeads);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch campaign leads' }, { status: 500 });
  }
}
