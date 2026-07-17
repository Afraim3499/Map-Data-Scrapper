export interface ScoringResult {
  torqiFitScore: number;
  leadGrade: string;
  dataConfidenceScore: number;
  primaryBucket: string | null;
  secondaryBuckets: string | null; // Comma-separated list
  salesHook: string | null;
  openingLine: string | null;
  outreachPriority: string;
  scoreBreakdownJson: string;
}

export function calculateLeadScore(
  lead: {
    phoneFormatted?: string | null;
    phoneRaw?: string | null;
    website?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    businessStatus?: string | null;
    closesBefore6?: boolean;
    closedSaturday?: boolean;
    closedSunday?: boolean;
    weekdayCloseTime?: string | null;
    hoursSummary?: string | null;
    rudeStaffMentioned?: boolean | null;
    noPickUpMentioned?: boolean | null;
    ownerName?: string | null;
  },
  scan: {
    scanStatus?: string | null;
    textCapability?: string | null;
    bookingFlowStrength?: string | null;
    detectedSoftware?: string | null;
    softwareEvidence?: string | null;
    formType?: string | null;
  }
): ScoringResult {
  const breakdown: Record<string, number> = {};
  
  // 1. Calculate TorQi Fit Score
  let rawScore = 0;
  
  // Closes before or at 6 PM: +15
  if (lead.closesBefore6) {
    rawScore += 15;
    breakdown['closes_before_6'] = 15;
  }
  
  // Closed Saturday: +10
  if (lead.closedSaturday) {
    rawScore += 10;
    breakdown['closed_saturday'] = 10;
  }
  
  // Closed Sunday: +10
  if (lead.closedSunday) {
    rawScore += 10;
    breakdown['closed_sunday'] = 10;
  }
  
  // 300+ reviews: +15
  if (lead.reviewCount && lead.reviewCount >= 300) {
    rawScore += 15;
    breakdown['reviews_300_plus'] = 15;
  }
  
  // 4.5+ rating: +10
  if (lead.rating && lead.rating >= 4.5) {
    rawScore += 10;
    breakdown['rating_4_5_plus'] = 10;
  }
  
  // No text capability found: +10
  if (scan.textCapability === 'Not Found') {
    rawScore += 10;
    breakdown['no_text_found'] = 10;
  }
  
  // Weak/missing booking flow: +10
  if (scan.bookingFlowStrength === 'Phone-first only' || scan.bookingFlowStrength === 'Weak or missing CTA') {
    rawScore += 10;
    breakdown['weak_booking'] = 10;
  }
  
  // Shop software detected: +15
  if (scan.detectedSoftware) {
    rawScore += 15;
    breakdown['software_detected'] = 15;
  }
  
  // Phone number available: +5
  if (lead.phoneRaw || lead.phoneFormatted) {
    rawScore += 5;
    breakdown['phone_available'] = 5;
  }
  
  // Website available: +5
  if (lead.website) {
    rawScore += 5;
    breakdown['website_available'] = 5;
  }
  
  // Business operational: +5
  if (lead.businessStatus === 'OPERATIONAL') {
    rawScore += 5;
    breakdown['business_operational'] = 5;
  }

  // Bonus Points from Maps Reviews (high pain points for TorQi automated receptionist)
  if (lead.noPickUpMentioned) {
    rawScore += 20;
    breakdown['review_phone_pickup_issues'] = 20;
  }

  if (lead.rudeStaffMentioned) {
    rawScore += 15;
    breakdown['review_rude_staff'] = 15;
  }
  
  // Normalization capped at 100
  const torqiFitScore = Math.min(100, Math.round((rawScore / 110) * 100));

  // 2. Assign Lead Grade
  // 80–100: A, 60–79: B, 40–59: C, 0–39: D
  let leadGrade = 'D';
  if (torqiFitScore >= 80) leadGrade = 'A';
  else if (torqiFitScore >= 60) leadGrade = 'B';
  else if (torqiFitScore >= 40) leadGrade = 'C';

  // 3. Data Confidence Score
  let dataConfidenceScore = 0;
  if (lead.phoneRaw || lead.phoneFormatted) dataConfidenceScore += 20;
  if (lead.website) dataConfidenceScore += 20;
  if (lead.hoursSummary && lead.hoursSummary !== 'Hours not available') dataConfidenceScore += 20;
  if (lead.rating !== null && lead.reviewCount !== null) dataConfidenceScore += 10;
  if (scan.scanStatus === 'scanned') dataConfidenceScore += 20;
  if (scan.detectedSoftware) dataConfidenceScore += 10;

  // 4. Determine Lead Buckets and hooks
  const buckets: { name: string; hook: string; openingLine: string }[] = [];

  // Bucket: Review-Evidenced Communication Issues
  if (lead.noPickUpMentioned || lead.rudeStaffMentioned) {
    let hook = 'Customer reviews specifically mention communication issues.';
    let opening = 'Hi, ';
    
    if (lead.noPickUpMentioned && lead.rudeStaffMentioned) {
      hook = 'Reviews indicate both rude front-desk experiences and unanswered calls. TorQi eliminates these friction points with friendly, instant AI reception.';
      opening = 'Hi, I noticed some online reviews where customers mentioned they had trouble getting someone on the phone and encountered some front-desk frustration. We help busy shops ensure 100% of calls are answered professionally.';
    } else if (lead.noPickUpMentioned) {
      hook = 'Multiple reviews mention the shop is hard to reach or doesn\'t answer calls. TorQi captures 100% of missed calls and after-hours callers.';
      opening = 'Hi, I saw in some reviews that customers mentioned it was a bit hard to reach you by phone. We help busy shops make sure no customer call goes unanswered, even during peak rush hours.';
    } else {
      hook = 'Reviews note rude staff or communication issues at the front desk. TorQi\'s conversational AI answers routine inquiries with consistent professionalism.';
      opening = 'Hi, I saw some customer feedback online regarding front-office communication. We provide shops with automated reception tools to support your team and ensure a polished customer experience.';
    }

    buckets.push({
      name: 'Review-Evidenced Communication Issues',
      hook,
      openingLine: opening,
    });
  }

  // Bucket 1: After-Hours Revenue Leak
  if (lead.closesBefore6 || lead.closedSaturday || lead.closedSunday) {
    const closingTime = lead.weekdayCloseTime ? `${lead.weekdayCloseTime} PM` : 'your normal closing time';
    buckets.push({
      name: 'After-Hours Revenue Leak',
      hook: `Your shop closes at ${closingTime}, but repair problems do not wait for business hours. TorQi can answer after-hours calls, capture customer and vehicle details, and prepare the next step before your team opens.`,
      openingLine: `Hi, I saw that you close at ${closingTime} on weekdays and are closed on weekends. Many vehicle problems arise after-hours; we help shops like yours capture and pre-qualify customers when your team is away.`,
    });
  }

  // Bucket 2: Busy Desk / High-Volume Shop
  if (lead.rating && lead.rating >= 4.5 && lead.reviewCount && lead.reviewCount >= 300) {
    buckets.push({
      name: 'Busy Desk / High-Volume Shop',
      hook: 'You have the kind of review volume that usually means the front desk is busy. TorQi can handle routine calls, collect details, and reduce pressure on advisors during peak hours.',
      openingLine: `Hi, I noticed your shop has over ${lead.reviewCount} reviews with an outstanding ${lead.rating} rating! I was calling because with that kind of volume, your front desk is probably slammed during peak hours. We help handle routine calls to free up your advisors.`,
    });
  }

  // Bucket 3: Pre-Integrated Software Fit
  if (scan.detectedSoftware) {
    buckets.push({
      name: 'Pre-Integrated Software Fit',
      hook: `We noticed your website appears to use ${scan.detectedSoftware}. TorQi can be configured around your existing shop-management workflow instead of forcing your team into a new process.`,
      openingLine: `Hi, I noticed you guys are using ${scan.detectedSoftware} for shop management. We build voice and text integrations directly with ${scan.detectedSoftware} to automate booking and log appointments.`,
    });
  }

  // Bucket 4: No Text / Weak Digital Intake
  if (scan.textCapability === 'Not Found' && scan.formType !== 'appointment_form' && scan.bookingFlowStrength === 'Phone-first only') {
    buckets.push({
      name: 'No Text / Weak Digital Intake',
      hook: 'Your website sends most customers toward a phone call. TorQi helps make sure those calls are answered, qualified, and organized even when your staff is busy.',
      openingLine: 'Hi, I noticed your website points most customers to call you directly, which is great, but we help ensure those calls are answered and logged even during busy hours or lunch breaks.',
    });
  }

  // Bucket 5: Website Exists, But Conversion Flow Is Weak
  if (lead.website && (scan.bookingFlowStrength === 'Phone-first only' || scan.bookingFlowStrength === 'Weak or missing CTA' || scan.formType === 'contact_form')) {
    buckets.push({
      name: 'Website Exists, But Conversion Flow Is Weak',
      hook: 'Customers can find you online, but the next step is still mostly manual. TorQi helps turn that interest into a captured lead or booked appointment.',
      openingLine: 'Hi, I saw your website is up and running, but there isn\'t an easy way for customers to schedule service or get an estimate online. We add automated scheduling tools to turn visitors into leads.',
    });
  }

  // Personalize with Owner Name if found
  if (lead.ownerName) {
    buckets.forEach(b => {
      if (b.openingLine.startsWith('Hi, ')) {
        b.openingLine = b.openingLine.replace('Hi, ', `Hi, I was hoping to connect with ${lead.ownerName}. I noticed `);
      }
    });
  }

  let primaryBucket: string | null = null;
  let secondaryList: string[] = [];
  let salesHook: string | null = null;
  let openingLine: string | null = null;

  if (buckets.length > 0) {
    primaryBucket = buckets[0].name;
    salesHook = buckets[0].hook;
    openingLine = buckets[0].openingLine;
    secondaryList = buckets.slice(1).map(b => b.name);
  }

  // Outreach priority based on Grade
  let outreachPriority = 'Low';
  if (leadGrade === 'A') outreachPriority = 'High';
  else if (leadGrade === 'B') outreachPriority = 'Medium';

  return {
    torqiFitScore,
    leadGrade,
    dataConfidenceScore,
    primaryBucket,
    secondaryBuckets: secondaryList.length > 0 ? secondaryList.join(', ') : null,
    salesHook,
    openingLine,
    outreachPriority,
    scoreBreakdownJson: JSON.stringify(breakdown),
  };
}
