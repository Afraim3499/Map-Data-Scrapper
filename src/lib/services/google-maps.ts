import { prisma } from '../db';

export interface PlaceDiscoveryResult {
  placeId: string;
}

export interface PlaceDetailsResult {
  placeId: string;
  businessName: string;
  phoneRaw: string | null;
  phoneFormatted: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  businessStatus: string | null;
  rating: number | null;
  reviewCount: number | null;
  primaryType: string | null;
  types: string[] | null;
  hoursJson: string | null;
  hoursSummary: string | null;
  mondayOpen: string | null;
  mondayClose: string | null;
  tuesdayOpen: string | null;
  tuesdayClose: string | null;
  wednesdayOpen: string | null;
  wednesdayClose: string | null;
  thursdayOpen: string | null;
  thursdayClose: string | null;
  fridayOpen: string | null;
  fridayClose: string | null;
  saturdayOpen: string | null;
  saturdayClose: string | null;
  sundayOpen: string | null;
  sundayClose: string | null;
  weekdayCloseTime: string | null;
  closedSaturday: boolean;
  closedSunday: boolean;
  closesBefore6: boolean;
  afterHoursGap: boolean;
}

// Normalize US phone numbers to (XXX) XXX-XXXX format
export function normalizeUSPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if standard US number (10 or 11 digits starting with 1)
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 11)}`;
  }
  
  // Return cleaned or raw if doesn't match US standard
  return phone;
}

// Parse address components to extract City, State, ZIP
export function parseAddress(formattedAddress: string | null): { city: string | null; state: string | null; zip: string | null } {
  const result = { city: null, state: null, zip: null } as { city: string | null; state: string | null; zip: string | null };
  if (!formattedAddress) return result;

  // Address format is usually: "Street, City, State ZIP, USA" or "Street, City, State ZIP"
  // Split by comma
  const parts = formattedAddress.split(',').map(p => p.trim());
  if (parts.length < 2) return result;

  // Look at the second to last or last part for State and ZIP
  // e.g. "GA 30303" or "Georgia 30303" or "GA"
  const stateZipPart = parts.find(p => {
    // Matches State Code followed by 5 digit zip
    return /\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/.test(p);
  }) || parts[parts.length - 2]; // fallback to second to last

  if (stateZipPart) {
    const match = stateZipPart.match(/\b([A-Z]{2}|[a-zA-Z\s]+)\s+(\d{5}(-\d{4})?)\b/);
    if (match) {
      result.state = match[1].trim();
      result.zip = match[2].trim();
    } else {
      // Just state or zip
      const justZip = stateZipPart.match(/\b\d{5}(-\d{4})?\b/);
      if (justZip) result.zip = justZip[0];
      
      const justState = stateZipPart.replace(/\b\d{5}(-\d{4})?\b/g, '').trim();
      if (justState && justState.length <= 20) result.state = justState;
    }
  }

  // City is usually the part before the stateZipPart or parts[parts.length - 3]
  const zipIndex = parts.indexOf(stateZipPart || '');
  if (zipIndex > 0) {
    result.city = parts[zipIndex - 1];
  } else if (parts.length >= 3) {
    result.city = parts[parts.length - 3];
  }

  return result;
}

// Parse Google Maps regularOpeningHours into structured fields
export function parseOpeningHours(hoursData: any): Partial<PlaceDetailsResult> {
  const result: Partial<PlaceDetailsResult> = {
    hoursJson: JSON.stringify(hoursData),
    hoursSummary: 'Hours not available',
    mondayOpen: null, mondayClose: null,
    tuesdayOpen: null, tuesdayClose: null,
    wednesdayOpen: null, wednesdayClose: null,
    thursdayOpen: null, thursdayClose: null,
    fridayOpen: null, fridayClose: null,
    saturdayOpen: null, saturdayClose: null,
    sundayOpen: null, sundayClose: null,
    weekdayCloseTime: null,
    closedSaturday: true,
    closedSunday: true,
    closesBefore6: false,
    afterHoursGap: false,
  };

  if (!hoursData) return result;

  // Get weekday text summary
  if (hoursData.weekdayText && Array.isArray(hoursData.weekdayText)) {
    result.hoursSummary = hoursData.weekdayText.join(', ');
  }

  const periods = hoursData.periods;
  if (!periods || !Array.isArray(periods)) return result;

  // Day mappings: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  
  const openDays = new Set<number>();

  for (const period of periods) {
    const open = period.open;
    const close = period.close;
    if (!open) continue;

    const dayIdx = open.day;
    openDays.add(dayIdx);
    const dayName = days[dayIdx];

    // Format time: "0800" or similar
    let openTime = '';
    let closeTime = '';

    if (open.hour !== undefined && open.minute !== undefined) {
      openTime = `${String(open.hour).padStart(2, '0')}${String(open.minute).padStart(2, '0')}`;
    } else if (open.time) {
      openTime = open.time; // already "0800"
    }

    if (close) {
      if (close.hour !== undefined && close.minute !== undefined) {
        closeTime = `${String(close.hour).padStart(2, '0')}${String(close.minute).padStart(2, '0')}`;
      } else if (close.time) {
        closeTime = close.time;
      }
    }

    (result as any)[`${dayName}Open`] = openTime || null;
    (result as any)[`${dayName}Close`] = closeTime || null;
  }

  // Calculate gaps
  result.closedSaturday = !openDays.has(6);
  result.closedSunday = !openDays.has(0);

  // Check weekday closing time (take Friday as example, or first weekday found)
  const weekdayClosingTimes = [
    result.mondayClose,
    result.tuesdayClose,
    result.wednesdayClose,
    result.thursdayClose,
    result.fridayClose
  ].filter(Boolean) as string[];

  if (weekdayClosingTimes.length > 0) {
    // Sort or take the earliest closing time
    const closeTime = weekdayClosingTimes[0]; // e.g. "1700" or "1800"
    if (closeTime.length === 4) {
      const hour = parseInt(closeTime.substring(0, 2), 10);
      const min = closeTime.substring(2, 4);
      result.weekdayCloseTime = `${hour}:${min}`;
      
      // closes before or equal 6 PM (18:00)
      if (hour <= 18) {
        result.closesBefore6 = true;
      }
    }
  }

  // After hours gap = closes before 6 PM OR closed Saturday OR closed Sunday
  result.afterHoursGap = !!(result.closesBefore6 || result.closedSaturday || result.closedSunday);

  return result;
}

// Fetch settings to get API key
async function getApiKey(): Promise<string | null> {
  const settings = await prisma.setting.findUnique({ where: { id: 'default' } });
  return settings?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || null;
}

// Google Places Text Search (New) API Call
export async function discoverPlaces(query: string, zipCode: string, campaignId: string): Promise<PlaceDiscoveryResult[]> {
  const apiKey = await getApiKey();
  const textQuery = `${query} near ${zipCode}`;

  if (!apiKey) {
    console.warn(`[Google Maps] No API key found. Generating MOCK place discovery for: "${textQuery}"`);
    return generateMockDiscovery(query, zipCode);
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,nextPageToken',
      },
      body: JSON.stringify({ textQuery }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Maps API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const places = data.places || [];
    
    // Save raw logs for API debug
    await prisma.log.create({
      data: {
        campaignId,
        level: 'info',
        message: `Places API Text Search completed for: "${textQuery}". Found ${places.length} places.`,
      },
    });

    return places.map((p: any) => ({
      placeId: p.id,
    }));
  } catch (error: any) {
    console.error(`[Google Maps] Error searching places for "${textQuery}":`, error);
    await prisma.log.create({
      data: {
        campaignId,
        level: 'error',
        message: `Google Maps Search failed for: "${textQuery}". Error: ${error.message || error}`,
      },
    });
    // Fallback to empty instead of crashing the job queue
    return [];
  }
}

// Google Place Details (New) API Call
export async function getPlaceDetails(placeId: string, campaignId: string): Promise<PlaceDetailsResult | null> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    console.warn(`[Google Maps] No API key found. Generating MOCK place details for Place ID: ${placeId}`);
    return generateMockDetails(placeId);
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,regularOpeningHours,rating,userRatingCount,websiteUri,businessStatus,googleMapsUri,location,primaryType,types',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Maps Place Details error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.id) return null;

    const formattedPhone = normalizeUSPhoneNumber(data.nationalPhoneNumber);
    const parsedAddr = parseAddress(data.formattedAddress);
    const parsedHours = parseOpeningHours(data.regularOpeningHours);

    const result: PlaceDetailsResult = {
      placeId: data.id,
      businessName: data.displayName?.text || 'Unknown Business',
      phoneRaw: data.nationalPhoneNumber || null,
      phoneFormatted: formattedPhone,
      website: data.websiteUri || null,
      address: data.formattedAddress || null,
      city: parsedAddr.city,
      state: parsedAddr.state,
      zip: parsedAddr.zip,
      latitude: data.location?.latitude || null,
      longitude: data.location?.longitude || null,
      googleMapsUrl: data.googleMapsUri || null,
      businessStatus: data.businessStatus || null,
      rating: data.rating || null,
      reviewCount: data.userRatingCount || null,
      primaryType: data.primaryType || null,
      types: data.types || [],
      hoursJson: parsedHours.hoursJson || null,
      hoursSummary: parsedHours.hoursSummary || null,
      mondayOpen: parsedHours.mondayOpen || null,
      mondayClose: parsedHours.mondayClose || null,
      tuesdayOpen: parsedHours.tuesdayOpen || null,
      tuesdayClose: parsedHours.tuesdayClose || null,
      wednesdayOpen: parsedHours.wednesdayOpen || null,
      wednesdayClose: parsedHours.wednesdayClose || null,
      thursdayOpen: parsedHours.thursdayOpen || null,
      thursdayClose: parsedHours.thursdayClose || null,
      fridayOpen: parsedHours.fridayOpen || null,
      fridayClose: parsedHours.fridayClose || null,
      saturdayOpen: parsedHours.saturdayOpen || null,
      saturdayClose: parsedHours.saturdayClose || null,
      sundayOpen: parsedHours.sundayOpen || null,
      sundayClose: parsedHours.sundayClose || null,
      weekdayCloseTime: parsedHours.weekdayCloseTime || null,
      closedSaturday: parsedHours.closedSaturday ?? true,
      closedSunday: parsedHours.closedSunday ?? true,
      closesBefore6: parsedHours.closesBefore6 ?? false,
      afterHoursGap: parsedHours.afterHoursGap ?? false,
    };

    return result;
  } catch (error: any) {
    console.error(`[Google Maps] Error fetching details for Place ID "${placeId}":`, error);
    await prisma.log.create({
      data: {
        campaignId,
        level: 'error',
        message: `Google Maps Place Details failed for: ${placeId}. Error: ${error.message || error}`,
      },
    });
    return null;
  }
}

// --- MOCK GENERATION HELPERS ---

function generateMockDiscovery(query: string, zipCode: string): PlaceDiscoveryResult[] {
  const count = Math.floor(Math.random() * 4) + 2; // 2 to 5 results per ZIP code
  const results: PlaceDiscoveryResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push({
      placeId: `mock_place_${zipCode}_${i}_${Math.random().toString(36).substring(2, 7)}`,
    });
  }
  return results;
}

const mockNames = [
  'Precision Auto Care', 'Summit Motors', 'Westside Repair Shop',
  'Peak Performance Garage', 'Bumper to Bumper Auto', 'Downtown Service Center',
  'Main Street Mechanic', 'Apex Transmissions', 'State Line Auto Repair',
  'First Class Auto Repair', 'Reliable Auto Care', 'Redline Garage',
  'Elite Collision Centers', 'Metro Auto Shop', 'Oakridge Tire & Brake'
];

const mockWebsites = [
  'https://www.google.com', // fallback website that exists
  'https://tekmetric.com', // Tekmetric evidence website
  'https://shopmonkey.io', // Shopmonkey evidence website
  null, // No website
  'http://localhost:3000', // website scanner should fail or block SSRF
];

function generateMockDetails(placeId: string): PlaceDetailsResult {
  const seed = placeId.split('_').pop() || 'abc';
  const nameIdx = Math.floor(Math.random() * mockNames.length);
  const shopName = `${mockNames[nameIdx]} (${seed.toUpperCase()})`;
  
  const rating = parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)); // 3.5 to 5.0
  const reviewCount = Math.floor(Math.random() * 500) + 15; // 15 to 515 reviews

  const webIdx = Math.floor(Math.random() * mockWebsites.length);
  const website = mockWebsites[webIdx];

  const zipMatch = placeId.match(/mock_place_(\d{5})_/);
  const zip = zipMatch ? zipMatch[1] : '30303';
  const state = 'GA'; // default to Georgia

  // Randomize hours: 70% closes before 6pm, 80% closed Saturday, 100% closed Sunday
  const closesBefore6 = Math.random() < 0.7;
  const closedSaturday = Math.random() < 0.8;
  const closedSunday = true;
  
  const closeHour = closesBefore6 ? (Math.random() < 0.5 ? 17 : 17) : 19; // 5 PM or 7 PM
  const closeTimeStr = `${closeHour}00`;

  const weekdayText = [
    `Monday: 8:00 AM – ${closeHour === 17 ? '5:00' : '7:00'} PM`,
    `Tuesday: 8:00 AM – ${closeHour === 17 ? '5:00' : '7:00'} PM`,
    `Wednesday: 8:00 AM – ${closeHour === 17 ? '5:00' : '7:00'} PM`,
    `Thursday: 8:00 AM – ${closeHour === 17 ? '5:00' : '7:00'} PM`,
    `Friday: 8:00 AM – ${closeHour === 17 ? '5:00' : '7:00'} PM`,
    `Saturday: ${closedSaturday ? 'Closed' : '8:00 AM – 3:00 PM'}`,
    `Sunday: Closed`
  ];

  const hoursJson = JSON.stringify({
    weekdayText,
    periods: [
      { open: { day: 1, hour: 8, minute: 0 }, close: { day: 1, hour: closeHour, minute: 0 } },
      { open: { day: 2, hour: 8, minute: 0 }, close: { day: 2, hour: closeHour, minute: 0 } },
      { open: { day: 3, hour: 8, minute: 0 }, close: { day: 3, hour: closeHour, minute: 0 } },
      { open: { day: 4, hour: 8, minute: 0 }, close: { day: 4, hour: closeHour, minute: 0 } },
      { open: { day: 5, hour: 8, minute: 0 }, close: { day: 5, hour: closeHour, minute: 0 } },
      ...(!closedSaturday ? [{ open: { day: 6, hour: 8, minute: 0 }, close: { day: 6, hour: 15, minute: 0 } }] : [])
    ]
  });

  const phoneRaw = `+14045550${Math.floor(Math.random() * 900) + 100}`;

  return {
    placeId,
    businessName: shopName,
    phoneRaw,
    phoneFormatted: normalizeUSPhoneNumber(phoneRaw),
    website,
    address: `100 Main St, Atlanta, GA ${zip}, USA`,
    city: 'Atlanta',
    state,
    zip,
    latitude: 33.75 + Math.random() * 0.1,
    longitude: -84.38 - Math.random() * 0.1,
    googleMapsUrl: `https://maps.google.com/?cid=${Math.floor(Math.random() * 900000000)}`,
    businessStatus: 'OPERATIONAL',
    rating,
    reviewCount,
    primaryType: 'auto_repair',
    types: ['auto_repair', 'car_repair', 'point_of_interest', 'establishment'],
    hoursJson,
    hoursSummary: `Mon-Fri 8:00 AM - ${closeHour === 17 ? '5:00' : '7:00'} PM, Sat: ${closedSaturday ? 'Closed' : '8:00 AM - 3:00 PM'}, Sun: Closed`,
    mondayOpen: '0800',
    mondayClose: closeTimeStr,
    tuesdayOpen: '0800',
    tuesdayClose: closeTimeStr,
    wednesdayOpen: '0800',
    wednesdayClose: closeTimeStr,
    thursdayOpen: '0800',
    thursdayClose: closeTimeStr,
    fridayOpen: '0800',
    fridayClose: closeTimeStr,
    saturdayOpen: closedSaturday ? null : '0800',
    saturdayClose: closedSaturday ? null : '1500',
    sundayOpen: null,
    sundayClose: null,
    weekdayCloseTime: `${closeHour}:00`,
    closedSaturday,
    closedSunday,
    closesBefore6: closeHour <= 18,
    afterHoursGap: true,
  };
}
