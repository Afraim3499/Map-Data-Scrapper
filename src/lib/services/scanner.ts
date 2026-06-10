import * as cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';
import { prisma } from '../db';

const lookupAsync = promisify(dns.lookup);

export interface ScanResult {
  scanStatus: string;
  httpStatus: number | null;
  finalUrl: string | null;
  homepageTitle: string | null;
  pagesScanned: number;
  appointmentPageFound: boolean;
  appointmentUrl: string | null;
  contactPageFound: boolean;
  contactUrl: string | null;
  bookingFlowStrength: string;
  textCapability: string;
  textEvidence: string | null;
  chatWidgetFound: boolean;
  chatWidgetName: string | null;
  formFound: boolean;
  formType: string | null;
  detectedSoftware: string | null;
  softwareConfidence: string | null;
  softwareEvidence: string | null;
  evidenceUrl: string | null;
  rawSignalsJson: string;
}

// 1. Prevent SSRF by validating the URL and checking the IP address
export async function validateUrlForSSRF(urlString: string): Promise<{ valid: boolean; ip?: string; reason?: string }> {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, reason: 'Only http and https protocols are allowed' };
    }

    // Block localhost and numeric loopbacks
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      return { valid: false, reason: 'Localhost access is blocked' };
    }

    // Resolve hostname to IP
    const lookupResult = await lookupAsync(hostname);
    let ip = lookupResult.address;

    // Check if IPv6 address
    if (ip.includes(':')) {
      const lowerIp = ip.toLowerCase();
      // Loopback / unspecified
      if (lowerIp === '::1' || lowerIp === '0:0:0:0:0:0:0:1' || lowerIp === '::') {
        return { valid: false, ip, reason: `Private IPv6 loopback blocked: ${ip}` };
      }
      // Link-local
      if (lowerIp.startsWith('fe80')) {
        return { valid: false, ip, reason: `Private Link-local IPv6 blocked: ${ip}` };
      }
      // Unique local address (fc00::/7)
      if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) {
        return { valid: false, ip, reason: `Private Unique Local IPv6 blocked: ${ip}` };
      }
      // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
      if (lowerIp.startsWith('::ffff:')) {
        ip = ip.substring(7); // Extract IPv4 part and fall through to IPv4 checks
      } else {
        // Safe public IPv6 address
        return { valid: true, ip };
      }
    }

    // Block private IP ranges
    // - 127.0.0.0/8 (Loopback)
    // - 10.0.0.0/8 (Private Class A)
    // - 172.16.0.0/12 (Private Class B)
    // - 192.168.0.0/16 (Private Class C)
    // - 169.254.0.0/16 (Link-local)
    // - 0.0.0.0
    if (
      ip.startsWith('127.') ||
      ip.startsWith('10.') ||
      ip.startsWith('169.254.') ||
      ip.startsWith('192.168.') ||
      ip === '0.0.0.0'
    ) {
      return { valid: false, ip, reason: `Private IP range blocked: ${ip}` };
    }

    // Parse Class B private range (172.16.0.0 - 172.31.255.255)
    const ipParts = ip.split('.').map(Number);
    if (ipParts.length === 4 && ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) {
      return { valid: false, ip, reason: `Private IP range blocked: ${ip}` };
    }

    return { valid: true, ip };
  } catch (error: any) {
    return { valid: false, reason: `Invalid URL or domain cannot be resolved: ${error.message || error}` };
  }
}

// Normalize URL to start with https:// if it lacks a protocol
export function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

// Normalize relative URLs to absolute based on base URL
export function makeAbsoluteUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

// Custom Website Scanner Service
export async function scanWebsite(rawUrl: string | null, leadId: string, campaignId: string): Promise<ScanResult> {
  const result: ScanResult = {
    scanStatus: 'not_started',
    httpStatus: null,
    finalUrl: null,
    homepageTitle: null,
    pagesScanned: 0,
    appointmentPageFound: false,
    appointmentUrl: null,
    contactPageFound: false,
    contactUrl: null,
    bookingFlowStrength: 'Unknown',
    textCapability: 'Not Found',
    textEvidence: null,
    chatWidgetFound: false,
    chatWidgetName: null,
    formFound: false,
    formType: null,
    detectedSoftware: null,
    softwareConfidence: null,
    softwareEvidence: null,
    evidenceUrl: null,
    rawSignalsJson: '{}',
  };

  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    result.scanStatus = 'no_website';
    result.textEvidence = 'No website URL available.';
    result.bookingFlowStrength = 'Phone-first only';
    return result;
  }

  result.finalUrl = normalized;

  // 1. Check for Simulation (Mock domains)
  if (normalized.includes('tekmetric.com')) {
    return simulateMockScan(normalized, 'Tekmetric');
  } else if (normalized.includes('shopmonkey.io') || normalized.includes('shopmonkey.cloud')) {
    return simulateMockScan(normalized, 'Shopmonkey');
  } else if (normalized.includes('shop-ware.com')) {
    return simulateMockScan(normalized, 'Shop-Ware');
  } else if (normalized.includes('autoleap.com')) {
    return simulateMockScan(normalized, 'AutoLeap');
  } else if (normalized.includes('google.com')) {
    return simulateMockScan(normalized, 'None');
  }

  // 2. Validate URL for SSRF
  const ssrfCheck = await validateUrlForSSRF(normalized);
  if (!ssrfCheck.valid) {
    result.scanStatus = 'blocked';
    result.textEvidence = `Blocked by SSRF protection: ${ssrfCheck.reason}`;
    result.bookingFlowStrength = 'Phone-first only';
    await prisma.log.create({
      data: {
        campaignId,
        leadId,
        level: 'warn',
        message: `Website scan blocked: "${normalized}". SSRF Shield active. Reason: ${ssrfCheck.reason}`,
      },
    });
    return result;
  }

  // Fetch timeout settings
  const settings = await prisma.setting.findUnique({ where: { id: 'default' } });
  const timeoutMs = (settings?.websiteTimeoutSeconds || 15) * 1000;

  const scannedUrls = new Set<string>();
  const pagesToScan: { url: string; depth: number; label: string }[] = [{ url: normalized, depth: 0, label: 'home' }];
  const signals: Record<string, any> = {};

  try {
    result.scanStatus = 'scanning';
    
    while (pagesToScan.length > 0 && scannedUrls.size < 10) {
      const currentPage = pagesToScan.shift()!;
      if (scannedUrls.has(currentPage.url)) continue;

      scannedUrls.add(currentPage.url);
      result.pagesScanned++;

      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(currentPage.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 TorQiTerritoryBuilder/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });

        clearTimeout(id);
        result.httpStatus = response.status;

        if (!response.ok) {
          if (currentPage.depth === 0) {
            result.scanStatus = 'failed';
            result.textEvidence = `HTTP error: ${response.status} ${response.statusText}`;
            break;
          }
          continue; // skip subpage errors
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        if (currentPage.depth === 0) {
          result.homepageTitle = $('title').text().trim() || 'No Title';
        }

        // Perform Software / Widget detections on this page's HTML
        detectSignals($, html, currentPage.url, signals);

        // Find relevant links on the homepage (depth 0)
        if (currentPage.depth === 0) {
          $('a').each((_, elem) => {
            const href = $(elem).attr('href');
            const linkText = $(elem).text().toLowerCase().trim();
            if (!href) return;

            const absoluteHref = makeAbsoluteUrl(normalized, href);
            
            // Check if link is to an internal subpage
            const baseHost = new URL(normalized).hostname;
            try {
              const linkHost = new URL(absoluteHref).hostname;
              if (linkHost !== baseHost) return; // skip external links
            } catch {
              return; // invalid URL
            }

            // Look for relevant page patterns
            const relevancePatterns = [
              'appointment', 'schedule', 'booking', 'book', 'service',
              'repair', 'contact', 'estimate', 'quote', 'text', 'sms', 'request'
            ];

            const isRelevant = relevancePatterns.some(p => linkText.includes(p) || href.toLowerCase().includes(p));

            if (isRelevant && !scannedUrls.has(absoluteHref) && pagesToScan.length < 15) {
              // Mark pages we find
              if (href.toLowerCase().includes('appointment') || href.toLowerCase().includes('book') || href.toLowerCase().includes('schedule')) {
                result.appointmentPageFound = true;
                result.appointmentUrl = absoluteHref;
              }
              if (href.toLowerCase().includes('contact')) {
                result.contactPageFound = true;
                result.contactUrl = absoluteHref;
              }
              
              pagesToScan.push({
                url: absoluteHref,
                depth: 1,
                label: linkText || 'subpage'
              });
            }
          });
        }
      } catch (err: any) {
        if (currentPage.depth === 0) {
          if (err.name === 'AbortError') {
            result.scanStatus = 'timeout';
            result.textEvidence = 'Scan timed out.';
          } else if (err.message?.includes('SSL') || err.message?.includes('certificate')) {
            result.scanStatus = 'ssl_error';
            result.textEvidence = `SSL Error: ${err.message}`;
          } else {
            result.scanStatus = 'failed';
            result.textEvidence = `Failed to crawl: ${err.message || err}`;
          }
          break;
        }
      }
    }

    // Process signals found across all pages
    if (result.scanStatus === 'scanning') {
      result.scanStatus = 'scanned';
    }

    interpretSignals(signals, result);

  } catch (error: any) {
    result.scanStatus = 'failed';
    result.textEvidence = `Unexpected scanner error: ${error.message || error}`;
    await prisma.log.create({
      data: {
        campaignId,
        leadId,
        level: 'error',
        message: `Custom scanner crashed on website: "${normalized}". Error: ${error.message || error}`,
      },
    });
  }

  return result;
}

// Detect Software, Chat widgets, and Booking widgets in HTML
function detectSignals($: cheerio.CheerioAPI, html: string, pageUrl: string, signals: Record<string, any>) {
  const code = html.toLowerCase();
  
  // 1. Software Detection Patterns
  const softwarePatterns = [
    { name: 'Tekmetric', regexes: [/tekmetric/i, /widget\.tekmetric\.com/i] },
    { name: 'Shopmonkey', regexes: [/shopmonkey/i, /shopmonkey\.io/i, /shopmonkey\.cloud/i] },
    { name: 'Shop-Ware', regexes: [/shop-ware/i, /shopware/i, /shop-ware\.com/i] },
    { name: 'AutoLeap', regexes: [/autoleap/i, /autoleap\.com/i] },
    { name: 'Mitchell 1', regexes: [/mitchell1/i, /shopkeypro/i, /managerse/i] },
    { name: 'NAPA TRACS', regexes: [/napatracs/i, /tracs/i] },
    { name: 'Protractor', regexes: [/protractorsoftware/i] },
    { name: 'RepairPal', regexes: [/repairpal/i] },
    { name: 'Demandforce', regexes: [/demandforce/i] },
    { name: 'Kukui', regexes: [/kukui/i] },
    { name: 'Steer', regexes: [/steercrm/i, /steer/i] },
    { name: 'Podium', regexes: [/podium\.com/i, /podium/i] },
    { name: 'Birdeye', regexes: [/birdeye\.com/i, /birdeye/i] },
    { name: 'GoSite', regexes: [/gosite\.com/i, /gosite/i] },
  ];

  for (const s of softwarePatterns) {
    for (const rx of s.regexes) {
      if (rx.test(code)) {
        if (!signals.software) signals.software = [];
        signals.software.push({
          name: s.name,
          evidence: `Pattern match "${rx.toString()}" found in HTML page code.`,
          url: pageUrl,
        });
      }
    }
  }

  // 2. Chat Widgets Detections
  const chatWidgets = [
    { name: 'Podium', regexes: [/podium\.com/i, /podium/i] },
    { name: 'Birdeye', regexes: [/birdeye\.com/i, /birdeye/i] },
    { name: 'LiveChat', regexes: [/livechat/i, /livechatinc/i] },
    { name: 'Intercom', regexes: [/intercom\.io/i, /intercomcdn/i] },
    { name: 'Drift', regexes: [/drift\.com/i, /drift/i] },
    { name: 'Tawk.to', regexes: [/tawk\.to/i, /tawk/i] },
    { name: 'Crisp', regexes: [/crisp\.chat/i, /crisp/i] },
    { name: 'Zendesk Chat', regexes: [/zopim/i, /zendesk/i] },
  ];

  for (const w of chatWidgets) {
    for (const rx of w.regexes) {
      if (rx.test(code)) {
        if (!signals.chat) signals.chat = [];
        signals.chat.push({
          name: w.name,
          evidence: `Chat widget script matched: "${rx.toString()}"`,
          url: pageUrl,
        });
      }
    }
  }

  // 3. Text/SMS capability keywords
  const textKeywords = [
    'text us', 'send us a text', 'sms', 'message us', 'chat with us',
    'mobile messaging', 'text-to-shop'
  ];

  // Look in visible text only to avoid script strings matching "text/javascript"
  const bodyText = $('body').text().toLowerCase();
  for (const kw of textKeywords) {
    if (bodyText.includes(kw)) {
      if (!signals.text) signals.text = [];
      
      // Extract sentence/context of the match
      const startIdx = Math.max(0, bodyText.indexOf(kw) - 40);
      const endIdx = Math.min(bodyText.length, bodyText.indexOf(kw) + kw.length + 40);
      const snippet = bodyText.substring(startIdx, endIdx).replace(/\s+/g, ' ').trim();

      signals.text.push({
        keyword: kw,
        evidence: `Text keyword found: "...${snippet}..."`,
        url: pageUrl,
      });
    }
  }

  // 4. Forms detection
  $('form').each((_, elem) => {
    const formCode = $(elem).html()?.toLowerCase() || '';
    const formId = $(elem).attr('id') || '';
    const formClass = $(elem).attr('class') || '';
    
    // Check if appointment form
    const apptKeywords = ['date', 'time', 'make', 'model', 'vehicle', 'year', 'schedule', 'book', 'vin'];
    const isAppt = apptKeywords.some(kw => formCode.includes(kw) || formId.toLowerCase().includes(kw) || formClass.toLowerCase().includes(kw));

    if (!signals.forms) signals.forms = [];
    signals.forms.push({
      type: isAppt ? 'appointment_form' : 'contact_form',
      evidence: `Form found with id="${formId}" class="${formClass}"`,
      url: pageUrl,
    });
  });

  // 5. Booking link / widget detections
  const bookingKeywords = [
    'book appointment', 'schedule service', 'request appointment',
    'request estimate', 'online booking', 'appointment request',
    'service request'
  ];
  for (const kw of bookingKeywords) {
    if (bodyText.includes(kw)) {
      if (!signals.booking) signals.booking = [];
      signals.booking.push({
        keyword: kw,
        evidence: `Booking keyword "${kw}" found in page text.`,
        url: pageUrl,
      });
    }
  }
}

// Interpret all gathered signals to populate the final ScanResult fields
function interpretSignals(signals: Record<string, any>, result: ScanResult) {
  result.rawSignalsJson = JSON.stringify(signals);

  // 1. Process Software Detections
  if (signals.software && signals.software.length > 0) {
    // Take the first software found
    const softwareInfo = signals.software[0];
    result.detectedSoftware = softwareInfo.name;
    // High confidence if matched multiple times, otherwise Medium
    const matchesCount = signals.software.filter((s: any) => s.name === softwareInfo.name).length;
    result.softwareConfidence = matchesCount >= 2 ? 'High' : 'Medium';
    result.softwareEvidence = softwareInfo.evidence;
    result.evidenceUrl = softwareInfo.url;
  }

  // 2. Process Forms Detections
  if (signals.forms && signals.forms.length > 0) {
    result.formFound = true;
    // Prioritize appointment_form
    const apptForm = signals.forms.find((f: any) => f.type === 'appointment_form');
    result.formType = apptForm ? 'appointment_form' : 'contact_form';
  }

  // 3. Process Text Capability Detections
  if (signals.text && signals.text.length > 0) {
    result.textCapability = 'Found';
    result.textEvidence = signals.text[0].evidence;
  } else if (signals.chat && signals.chat.length > 0) {
    // Chat widget matches also imply digital intake/text
    result.textCapability = 'Found';
    result.textEvidence = `Chat widget (${signals.chat[0].name}) detected on site.`;
  } else {
    result.textCapability = 'Not Found';
  }

  // 4. Process Chat Widgets
  if (signals.chat && signals.chat.length > 0) {
    result.chatWidgetFound = true;
    result.chatWidgetName = signals.chat[0].name;
  }

  // 5. Calculate Booking Flow Strength
  // - Strong booking flow: Has a detected software (like Tekmetric iframe, Shopmonkey scheduling widget) OR has an appointment form
  // - Basic contact form: Has a contact form
  // - Phone-first only: Has no software, no forms, no booking keywords
  // - Text-enabled / Chat-enabled: Has text or chat capability
  if (result.detectedSoftware && result.detectedSoftware !== 'Podium' && result.detectedSoftware !== 'Birdeye') {
    result.bookingFlowStrength = 'Strong booking flow';
  } else if (result.formType === 'appointment_form') {
    result.bookingFlowStrength = 'Strong booking flow';
  } else if (result.formType === 'contact_form') {
    result.bookingFlowStrength = 'Basic contact form';
  } else if (result.chatWidgetFound) {
    result.bookingFlowStrength = 'Chat-enabled';
  } else if (result.textCapability === 'Found') {
    result.bookingFlowStrength = 'Text-enabled';
  } else if (signals.booking && signals.booking.length > 0) {
    result.bookingFlowStrength = 'Basic contact form';
  } else {
    result.bookingFlowStrength = 'Phone-first only';
  }
}

// Simulate scanning for test websites
function simulateMockScan(url: string, softwareName: string): ScanResult {
  const result: ScanResult = {
    scanStatus: 'scanned',
    httpStatus: 200,
    finalUrl: url,
    homepageTitle: `${softwareName !== 'None' ? softwareName : 'Apex'} Auto Lube - Premium Car Service Center`,
    pagesScanned: 3,
    appointmentPageFound: softwareName !== 'None',
    appointmentUrl: softwareName !== 'None' ? `${url}/schedule-service` : null,
    contactPageFound: true,
    contactUrl: `${url}/contact`,
    bookingFlowStrength: softwareName !== 'None' ? 'Strong booking flow' : 'Basic contact form',
    textCapability: 'Not Found',
    textEvidence: 'No mobile text capability detected in mock scan.',
    chatWidgetFound: false,
    chatWidgetName: null,
    formFound: true,
    formType: softwareName !== 'None' ? 'appointment_form' : 'contact_form',
    detectedSoftware: softwareName !== 'None' ? softwareName : null,
    softwareConfidence: softwareName !== 'None' ? 'High' : null,
    softwareEvidence: softwareName !== 'None' ? `Found ${softwareName.toLowerCase()} scripts embedded in booking flow.` : null,
    evidenceUrl: softwareName !== 'None' ? `${url}/schedule-service` : null,
    rawSignalsJson: '{}',
  };

  if (softwareName === 'Tekmetric') {
    result.rawSignalsJson = '{"tekmetric":true,"widget.tekmetric.com":true}';
  } else if (softwareName === 'Shopmonkey') {
    result.rawSignalsJson = '{"shopmonkey":true,"shopmonkey.io":true}';
  } else if (softwareName === 'Shop-Ware') {
    result.rawSignalsJson = '{"shop-ware":true,"shopware":true}';
  } else if (softwareName === 'AutoLeap') {
    result.rawSignalsJson = '{"autoleap":true,"autoleap.com":true}';
  }

  return result;
}
