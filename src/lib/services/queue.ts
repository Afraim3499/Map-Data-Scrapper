import { prisma } from '../db';
import { discoverPlaces, getPlaceDetails } from './google-maps';
import { scanWebsite } from './scanner';
import { calculateLeadScore } from './scoring';
import { getZipsForState } from './zip-codes';

// Process a single campaign job
export async function processCampaignJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { campaign: true },
  });

  if (!job || job.status !== 'pending') return;

  const campaign = job.campaign;
  
  // Update job and campaign to processing
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'discovering_places', updatedAt: new Date() },
  });

  await prisma.log.create({
    data: {
      campaignId: campaign.id,
      level: 'info',
      message: `Started campaign processing job. Status: discovering_places.`,
    },
  });

  try {
    const settings = await prisma.setting.findUnique({ where: { id: 'default' } });
    const maxZips = settings?.maxZipsPerCampaign ?? 10;
    const maxQueries = settings?.maxQueriesPerZip ?? 5;

    // --- PHASE 1: PLACE DISCOVERY ---
    const zips = getZipsForState(campaign.state, maxZips);
    const queries = campaign.searchQueries.split(',').map(q => q.trim()).slice(0, maxQueries);

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { totalZips: zips.length },
    });

    let totalPlaceIdsFound = 0;
    
    // Loop through ZIPs + queries (resume support)
    for (let i = campaign.processedZips; i < zips.length; i++) {
      const zip = zips[i];
      
      // Check if campaign was paused/cancelled
      const currentCampaignState = await prisma.campaign.findUnique({ where: { id: campaign.id } });
      if (currentCampaignState?.status === 'paused' || currentCampaignState?.status === 'cancelled') {
        throw new Error(`Campaign was ${currentCampaignState.status}`);
      }

      for (const query of queries) {
        const discovered = await discoverPlaces(query, zip, campaign.id);
        totalPlaceIdsFound += discovered.length;

        for (const place of discovered) {
          // Check duplicate
          const existing = await prisma.placesRaw.findFirst({
            where: { campaignId: campaign.id, placeId: place.placeId },
          });

          if (existing) {
            await prisma.placesRaw.update({
              where: { id: existing.id },
              data: { duplicateCount: { increment: 1 } },
            });
          } else {
            await prisma.placesRaw.create({
              data: {
                campaignId: campaign.id,
                placeId: place.placeId,
                query,
                zipCode: zip,
                state: campaign.state,
              },
            });
          }
        }
      }

      // Update progress
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          processedZips: i + 1,
          totalPlaceIds: totalPlaceIdsFound,
        },
      });
    }

    // --- PHASE 2: DEDUPLICATION ---
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'deduplicating', updatedAt: new Date() },
    });

    const uniquePlaces = await prisma.placesRaw.findMany({
      where: { campaignId: campaign.id },
      distinct: ['placeId'],
    });

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { uniquePlaceIds: uniquePlaces.length },
    });

    await prisma.log.create({
      data: {
        campaignId: campaign.id,
        level: 'info',
        message: `Deduplication complete. Discovered ${totalPlaceIdsFound} raw listings, resolved to ${uniquePlaces.length} unique Place IDs.`,
      },
    });

    // --- PHASE 3: PLACE DETAILS ENRICHMENT ---
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'fetching_details', updatedAt: new Date() },
    });

    const leadIds: string[] = [];

    for (let i = 0; i < uniquePlaces.length; i++) {
      const place = uniquePlaces[i];

      // Check pause/cancel
      const currentCampaignState = await prisma.campaign.findUnique({ where: { id: campaign.id } });
      if (currentCampaignState?.status === 'paused' || currentCampaignState?.status === 'cancelled') {
        throw new Error(`Campaign was ${currentCampaignState.status}`);
      }

      // Check if lead already exists (resume support)
      const existingLead = await prisma.lead.findFirst({
        where: { campaignId: campaign.id, placeId: place.placeId },
      });
      if (existingLead) {
        leadIds.push(existingLead.id);
        continue;
      }

      const details = await getPlaceDetails(place.placeId, campaign.id);
      if (details) {
        // Create Lead
        const newLead = await prisma.lead.create({
          data: {
            campaignId: campaign.id,
            placeId: details.placeId,
            businessName: details.businessName,
            phoneRaw: details.phoneRaw,
            phoneFormatted: details.phoneFormatted,
            website: details.website,
            address: details.address,
            city: details.city,
            state: details.state,
            zip: details.zip,
            latitude: details.latitude,
            longitude: details.longitude,
            googleMapsUrl: details.googleMapsUrl,
            businessStatus: details.businessStatus,
            rating: details.rating,
            reviewCount: details.reviewCount,
            primaryType: details.primaryType,
            types: details.types ? details.types.join(',') : null,
            hoursJson: details.hoursJson,
            hoursSummary: details.hoursSummary,
            mondayOpen: details.mondayOpen,
            mondayClose: details.mondayClose,
            tuesdayOpen: details.tuesdayOpen,
            tuesdayClose: details.tuesdayClose,
            wednesdayOpen: details.wednesdayOpen,
            wednesdayClose: details.wednesdayClose,
            thursdayOpen: details.thursdayOpen,
            thursdayClose: details.thursdayClose,
            fridayOpen: details.fridayOpen,
            fridayClose: details.fridayClose,
            saturdayOpen: details.saturdayOpen,
            saturdayClose: details.saturdayClose,
            sundayOpen: details.sundayOpen,
            sundayClose: details.sundayClose,
            weekdayCloseTime: details.weekdayCloseTime,
            closedSaturday: details.closedSaturday,
            closedSunday: details.closedSunday,
            closesBefore6: details.closesBefore6,
            afterHoursGap: details.afterHoursGap,
          },
        });
        leadIds.push(newLead.id);
      }

      // Update enriched progress
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { totalEnriched: i + 1 },
      });
    }

    // --- PHASE 4: WEBSITE CRAWLER/SCANNER ---
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'scanning_websites', updatedAt: new Date() },
    });

    const activeLeads = await prisma.lead.findMany({
      where: { campaignId: campaign.id },
    });

    for (let i = 0; i < activeLeads.length; i++) {
      const lead = activeLeads[i];

      // Check pause/cancel
      const currentCampaignState = await prisma.campaign.findUnique({ where: { id: campaign.id } });
      if (currentCampaignState?.status === 'paused' || currentCampaignState?.status === 'cancelled') {
        throw new Error(`Campaign was ${currentCampaignState.status}`);
      }

      // Skip if scan already exists (resume support)
      const existingScan = await prisma.websiteScan.findFirst({
        where: { leadId: lead.id },
      });
      if (existingScan && existingScan.scanStatus !== 'not_started' && existingScan.scanStatus !== 'scanning') {
        continue;
      }

      // Execute scan (internally handles missing URL and SSRF check)
      const scanResult = await scanWebsite(lead.website, lead.id, campaign.id);

      // Clean old scan if exists
      if (existingScan) {
        await prisma.websiteScan.delete({ where: { id: existingScan.id } });
      }

      await prisma.websiteScan.create({
        data: {
          leadId: lead.id,
          scanStatus: scanResult.scanStatus,
          httpStatus: scanResult.httpStatus,
          finalUrl: scanResult.finalUrl,
          homepageTitle: scanResult.homepageTitle,
          pagesScanned: scanResult.pagesScanned,
          appointmentPageFound: scanResult.appointmentPageFound,
          appointmentUrl: scanResult.appointmentUrl,
          contactPageFound: scanResult.contactPageFound,
          contactUrl: scanResult.contactUrl,
          bookingFlowStrength: scanResult.bookingFlowStrength,
          textCapability: scanResult.textCapability,
          textEvidence: scanResult.textEvidence,
          chatWidgetFound: scanResult.chatWidgetFound,
          chatWidgetName: scanResult.chatWidgetName,
          formFound: scanResult.formFound,
          formType: scanResult.formType,
          detectedSoftware: scanResult.detectedSoftware,
          softwareConfidence: scanResult.softwareConfidence,
          softwareEvidence: scanResult.softwareEvidence,
          evidenceUrl: scanResult.evidenceUrl,
          rawSignalsJson: scanResult.rawSignalsJson,
        },
      });

      // Update scanned count
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { totalScanned: i + 1 },
      });
    }

    // --- PHASE 5: LEAD SCORING ---
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'scoring_leads', updatedAt: new Date() },
    });

    const leadsToScore = await prisma.lead.findMany({
      where: { campaignId: campaign.id },
      include: { websiteScans: true },
    });

    let qualifiedCount = 0;

    for (const lead of leadsToScore) {
      const scan = lead.websiteScans[0] || {};
      
      const score = calculateLeadScore(lead, scan);

      // Skip or overwrite score (resume support)
      const existingScore = await prisma.leadScore.findFirst({
        where: { leadId: lead.id },
      });
      if (existingScore) {
        await prisma.leadScore.update({
          where: { id: existingScore.id },
          data: {
            torqiFitScore: score.torqiFitScore,
            leadGrade: score.leadGrade,
            dataConfidenceScore: score.dataConfidenceScore,
            primaryBucket: score.primaryBucket,
            secondaryBuckets: score.secondaryBuckets,
            salesHook: score.salesHook,
            openingLine: score.openingLine,
            outreachPriority: score.outreachPriority,
            scoreBreakdownJson: score.scoreBreakdownJson,
          },
        });
      } else {
        await prisma.leadScore.create({
          data: {
            leadId: lead.id,
            torqiFitScore: score.torqiFitScore,
            leadGrade: score.leadGrade,
            dataConfidenceScore: score.dataConfidenceScore,
            primaryBucket: score.primaryBucket,
            secondaryBuckets: score.secondaryBuckets,
            salesHook: score.salesHook,
            openingLine: score.openingLine,
            outreachPriority: score.outreachPriority,
            scoreBreakdownJson: score.scoreBreakdownJson,
          },
        });
      }

      if (score.leadGrade === 'A' || score.leadGrade === 'B') {
        qualifiedCount++;
      }
    }

    // --- PHASE 6: COMPLETION ---
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'complete',
        totalQualified: qualifiedCount,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    await prisma.log.create({
      data: {
        campaignId: campaign.id,
        level: 'info',
        message: `Campaign processing completed successfully. Qualified ${qualifiedCount} A/B grade leads.`,
      },
    });

  } catch (error: any) {
    console.error(`[Job Queue] Job ${jobId} failed:`, error);
    
    const status = error.message === 'Campaign was paused' ? 'paused' : 
                   error.message === 'Campaign was cancelled' ? 'cancelled' : 'failed';

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status },
    });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: status === 'paused' || status === 'cancelled' ? status : 'failed',
        errorMessage: error.message || String(error),
        completedAt: new Date(),
      },
    });

    await prisma.log.create({
      data: {
        campaignId: campaign.id,
        level: 'error',
        message: `Campaign job ended with status: ${status}. Message: ${error.message || error}`,
      },
    });
  }
}

// Push a new job and run in background (non-blocking)
export async function queueCampaignJob(campaignId: string) {
  // Create Job record
  const job = await prisma.job.create({
    data: {
      campaignId,
      type: 'process_campaign',
      status: 'pending',
      maxAttempts: 3,
    },
  });

  // Update campaign to queued
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'queued' },
  });

  // Execute processing asynchronously in background
  processCampaignJob(job.id).catch(err => {
    console.error(`Background job execution exception for job ${job.id}:`, err);
  });

  return job;
}

// Process a single step/tick of the campaign (Serverless friendly)
export async function processCampaignTick(campaignId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    const activeStatuses = [
      'queued',
      'discovering_places',
      'deduplicating',
      'fetching_details',
      'scanning_websites',
      'scoring_leads'
    ];

    if (!activeStatuses.includes(campaign.status)) {
      return { success: true, message: `Campaign is in non-active status: ${campaign.status}`, status: campaign.status };
    }

    // Check if campaign was paused/cancelled
    if (campaign.status === 'paused' || campaign.status === 'cancelled') {
      return { success: true, message: `Campaign is ${campaign.status}`, status: campaign.status };
    }

    // Load Default settings
    const settings = await prisma.setting.findUnique({ where: { id: 'default' } });
    const maxZips = settings?.maxZipsPerCampaign ?? 10;
    const maxQueries = settings?.maxQueriesPerZip ?? 5;

    const zips = getZipsForState(campaign.state, maxZips);
    const queries = campaign.searchQueries.split(',').map(q => q.trim()).slice(0, maxQueries);

    // 1. QUEUED -> DISCOVERING PLACES
    if (campaign.status === 'queued') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'discovering_places',
          totalZips: zips.length,
          processedZips: 0,
          updatedAt: new Date()
        }
      });
      await prisma.log.create({
        data: {
          campaignId,
          level: 'info',
          message: 'Campaign initialized (Serverless Tick). Starting place discovery.',
        }
      });
      return { success: true, status: 'discovering_places' };
    }

    // 2. DISCOVERING PLACES
    if (campaign.status === 'discovering_places') {
      const i = campaign.processedZips;
      if (i >= zips.length) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'deduplicating', updatedAt: new Date() }
        });
        return { success: true, status: 'deduplicating' };
      }

      const zip = zips[i];
      let totalPlaceIdsFound = campaign.totalPlaceIds;

      for (const query of queries) {
        const discovered = await discoverPlaces(query, zip, campaignId);
        totalPlaceIdsFound += discovered.length;

        for (const place of discovered) {
          const existing = await prisma.placesRaw.findFirst({
            where: { campaignId, placeId: place.placeId },
          });

          if (existing) {
            await prisma.placesRaw.update({
              where: { id: existing.id },
              data: { duplicateCount: { increment: 1 } },
            });
          } else {
            await prisma.placesRaw.create({
              data: {
                campaignId,
                placeId: place.placeId,
                query,
                zipCode: zip,
                state: campaign.state,
              },
            });
          }
        }
      }

      const nextZipIndex = i + 1;
      const isDone = nextZipIndex >= zips.length;

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          processedZips: nextZipIndex,
          totalPlaceIds: totalPlaceIdsFound,
          status: isDone ? 'deduplicating' : 'discovering_places',
          updatedAt: new Date()
        }
      });

      await prisma.log.create({
        data: {
          campaignId,
          level: 'info',
          message: `Processed ZIP code ${zip} (${nextZipIndex}/${zips.length}). Discovered leads so far: ${totalPlaceIdsFound}.`,
        }
      });

      return { success: true, status: isDone ? 'deduplicating' : 'discovering_places' };
    }

    // 3. DEDUPLICATING
    if (campaign.status === 'deduplicating') {
      const uniquePlaces = await prisma.placesRaw.findMany({
        where: { campaignId },
        distinct: ['placeId'],
      });

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          uniquePlaceIds: uniquePlaces.length,
          status: 'fetching_details',
          updatedAt: new Date()
        }
      });

      await prisma.log.create({
        data: {
          campaignId,
          level: 'info',
          message: `Deduplication complete. Resolved to ${uniquePlaces.length} unique Place IDs. Moving to detail enrichment.`,
        }
      });

      return { success: true, status: 'fetching_details' };
    }

    // 4. FETCHING DETAILS
    if (campaign.status === 'fetching_details') {
      const uniquePlaces = await prisma.placesRaw.findMany({
        where: { campaignId },
        distinct: ['placeId'],
      });

      const leads = await prisma.lead.findMany({
        where: { campaignId },
        select: { placeId: true }
      });
      const existingPlaceIds = new Set(leads.map(l => l.placeId));
      const pendingPlaces = uniquePlaces.filter(p => !existingPlaceIds.has(p.placeId));

      if (pendingPlaces.length === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'scanning_websites', updatedAt: new Date() }
        });
        return { success: true, status: 'scanning_websites' };
      }

      // Process a batch of 2 details to keep Vercel execution times fast
      const batch = pendingPlaces.slice(0, 2);
      for (const place of batch) {
        const details = await getPlaceDetails(place.placeId, campaignId);
        if (details) {
          await prisma.lead.create({
            data: {
              campaignId,
              placeId: details.placeId,
              businessName: details.businessName,
              phoneRaw: details.phoneRaw,
              phoneFormatted: details.phoneFormatted,
              website: details.website,
              address: details.address,
              city: details.city,
              state: details.state,
              zip: details.zip,
              latitude: details.latitude,
              longitude: details.longitude,
              googleMapsUrl: details.googleMapsUrl,
              businessStatus: details.businessStatus,
              rating: details.rating,
              reviewCount: details.reviewCount,
              primaryType: details.primaryType,
              types: details.types ? details.types.join(',') : null,
              hoursJson: details.hoursJson,
              hoursSummary: details.hoursSummary,
              mondayOpen: details.mondayOpen,
              mondayClose: details.mondayClose,
              tuesdayOpen: details.tuesdayOpen,
              tuesdayClose: details.tuesdayClose,
              wednesdayOpen: details.wednesdayOpen,
              wednesdayClose: details.wednesdayClose,
              thursdayOpen: details.thursdayOpen,
              thursdayClose: details.thursdayClose,
              fridayOpen: details.fridayOpen,
              fridayClose: details.fridayClose,
              saturdayOpen: details.saturdayOpen,
              saturdayClose: details.saturdayClose,
              sundayOpen: details.sundayOpen,
              sundayClose: details.sundayClose,
              weekdayCloseTime: details.weekdayCloseTime,
              closedSaturday: details.closedSaturday,
              closedSunday: details.closedSunday,
              closesBefore6: details.closesBefore6,
              afterHoursGap: details.afterHoursGap,
            }
          });
        }
      }

      const currentLeadsCount = await prisma.lead.count({ where: { campaignId } });
      const isDone = currentLeadsCount >= uniquePlaces.length;

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalEnriched: currentLeadsCount,
          status: isDone ? 'scanning_websites' : 'fetching_details',
          updatedAt: new Date()
        }
      });

      return { success: true, status: isDone ? 'scanning_websites' : 'fetching_details' };
    }

    // 5. SCANNING WEBSITES
    if (campaign.status === 'scanning_websites') {
      const activeLeads = await prisma.lead.findMany({
        where: { campaignId },
      });

      const scans = await prisma.websiteScan.findMany({
        where: { lead: { campaignId } },
        select: { leadId: true }
      });
      const scannedLeadIds = new Set(scans.map(s => s.leadId));
      const pendingLeads = activeLeads.filter(l => !scannedLeadIds.has(l.id));

      if (pendingLeads.length === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'scoring_leads', updatedAt: new Date() }
        });
        return { success: true, status: 'scoring_leads' };
      }

      // Process 1 website scan to stay within serverless execution duration limits
      const lead = pendingLeads[0];
      const scanResult = await scanWebsite(lead.website, lead.id, campaignId);
      
      await prisma.websiteScan.create({
        data: {
          leadId: lead.id,
          scanStatus: scanResult.scanStatus,
          httpStatus: scanResult.httpStatus,
          finalUrl: scanResult.finalUrl,
          homepageTitle: scanResult.homepageTitle,
          pagesScanned: scanResult.pagesScanned,
          appointmentPageFound: scanResult.appointmentPageFound,
          appointmentUrl: scanResult.appointmentUrl,
          contactPageFound: scanResult.contactPageFound,
          contactUrl: scanResult.contactUrl,
          bookingFlowStrength: scanResult.bookingFlowStrength,
          textCapability: scanResult.textCapability,
          textEvidence: scanResult.textEvidence,
          chatWidgetFound: scanResult.chatWidgetFound,
          chatWidgetName: scanResult.chatWidgetName,
          formFound: scanResult.formFound,
          formType: scanResult.formType,
          detectedSoftware: scanResult.detectedSoftware,
          softwareConfidence: scanResult.softwareConfidence,
          softwareEvidence: scanResult.softwareEvidence,
          evidenceUrl: scanResult.evidenceUrl,
          rawSignalsJson: scanResult.rawSignalsJson,
        }
      });

      const currentScannedCount = await prisma.websiteScan.count({
        where: { lead: { campaignId } }
      });
      const isDone = currentScannedCount >= activeLeads.length;

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalScanned: currentScannedCount,
          status: isDone ? 'scoring_leads' : 'scanning_websites',
          updatedAt: new Date()
        }
      });

      return { success: true, status: isDone ? 'scoring_leads' : 'scanning_websites' };
    }

    // 6. SCORING LEADS
    if (campaign.status === 'scoring_leads') {
      const leadsToScore = await prisma.lead.findMany({
        where: { campaignId },
        include: { websiteScans: true },
      });

      let qualifiedCount = 0;

      for (const lead of leadsToScore) {
        const scan = lead.websiteScans[0] || {};
        const score = calculateLeadScore(lead, scan);

        const existingScore = await prisma.leadScore.findFirst({
          where: { leadId: lead.id },
        });

        if (existingScore) {
          await prisma.leadScore.update({
            where: { id: existingScore.id },
            data: {
              torqiFitScore: score.torqiFitScore,
              leadGrade: score.leadGrade,
              dataConfidenceScore: score.dataConfidenceScore,
              primaryBucket: score.primaryBucket,
              secondaryBuckets: score.secondaryBuckets,
              salesHook: score.salesHook,
              openingLine: score.openingLine,
              outreachPriority: score.outreachPriority,
              scoreBreakdownJson: score.scoreBreakdownJson,
            },
          });
        } else {
          await prisma.leadScore.create({
            data: {
              leadId: lead.id,
              torqiFitScore: score.torqiFitScore,
              leadGrade: score.leadGrade,
              dataConfidenceScore: score.dataConfidenceScore,
              primaryBucket: score.primaryBucket,
              secondaryBuckets: score.secondaryBuckets,
              salesHook: score.salesHook,
              openingLine: score.openingLine,
              outreachPriority: score.outreachPriority,
              scoreBreakdownJson: score.scoreBreakdownJson,
            },
          });
        }

        if (score.leadGrade === 'A' || score.leadGrade === 'B') {
          qualifiedCount++;
        }
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'complete',
          totalQualified: qualifiedCount,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.log.create({
        data: {
          campaignId,
          level: 'info',
          message: `Campaign processing completed. Qualified ${qualifiedCount} A/B grade leads.`,
        },
      });

      return { success: true, status: 'complete' };
    }

    return { success: true, status: campaign.status };
  } catch (error: any) {
    console.error(`[Job Queue Tick] Campaign ${campaignId} tick failed:`, error);
    const status = error.message === 'Campaign was paused' ? 'paused' : 
                   error.message === 'Campaign was cancelled' ? 'cancelled' : 'failed';

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status },
    });

    await prisma.log.create({
      data: {
        campaignId,
        level: 'error',
        message: `Campaign tick ended with status: ${status}. Message: ${error.message || error}`,
      },
    });

    return { success: false, error: error.message || String(error) };
  }
}
