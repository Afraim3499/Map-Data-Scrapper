Yes. Here is the final solid plan:

# **TorQi Map Data Scraper**

## **One external API only: Google Maps API**

Everything else: your own backend, scraper, scoring engine, UI, enrichment, CSV export, formatting, and CRM-ready output.

The product should not feel like a raw scraper. It should feel like an internal **TorQi lead intelligence tool** built for auto repair and dealership prospecting.

---

# **1\. Product Goal**

Build a beautiful web app where your team can:

1. Select a US state.  
2. Select business category.  
3. Run Google Maps lead discovery.  
4. Enrich each business with operational signals.  
5. Scan their website using your own custom code.  
6. Detect TorQi-relevant sales angles.  
7. Score and bucket the leads.  
8. View everything in a polished dashboard.  
9. Download clean CSV files.  
10. Push the data into your sales workflow later.

Only external data API:

**Google Maps Platform / Places API.**

Google’s Places API requires billing and an API key or OAuth token for requests, and Google recommends field masks so you only request the fields you need. ([Google for Developers](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing?utm_source=chatgpt.com))

---

# **2\. Core System Architecture**

```
TorQi Map Data Scraper
        │
        ├── Landing Page
        │
        ├── Auth / Internal Access
        │
        ├── Scraper Dashboard
        │
        ├── Campaign Builder
        │
        ├── Google Places Discovery Engine
        │
        ├── Place Details Enrichment Engine
        │
        ├── Custom Website Scanner
        │
        ├── Tech Detection Engine
        │
        ├── Lead Scoring Engine
        │
        ├── Data Quality Engine
        │
        ├── CSV Export Engine
        │
        └── Lead Database
```

Recommended stack, with no third-party enrichment tools:

| Layer | Recommended |
| ----- | ----- |
| Frontend | Next.js \+ Tailwind |
| Backend | Node.js / Next.js API routes |
| Database | PostgreSQL |
| Queue | Your own DB-based queue or self-hosted Redis |
| Website scanner | Custom Node.js fetch \+ Cheerio |
| JS-heavy scanner | Optional custom Playwright worker |
| CSV generation | Custom backend code |
| Hosting | Your own VPS if you want strict control |
| External data API | Google Maps Places API only |

If you want the strictest “no third-party except Google” setup, use a VPS, PostgreSQL, Docker, and your own queue system.

---

# **3\. Landing Page Plan**

The landing page should look premium, not like a developer tool.

## **Page Name**

**TorQi Map Data Scraper**

Alternative names:

| Name | Feel |
| ----- | ----- |
| TorQi Lead Map | Simple and clean |
| TorQi Market Scanner | More strategic |
| TorQi Auto Lead Engine | More sales-focused |
| TorQi Map Intelligence | Premium |
| TorQi Territory Builder | Best for state-by-state sales |

My pick:

# **TorQi Territory Builder**

Because this is not just scraping. It is building sales territories.

---

## **Landing Page Structure**

### **Hero Section**

**Headline:**  
**Find auto shops that need TorQi before your sales team calls them.**

**Subheadline:**  
State-by-state Google Maps discovery, website scanning, software detection, after-hours scoring, and CSV-ready lead exports for TorQi outreach.

**CTA Buttons:**  
`Start New Scan`  
`View Previous Campaigns`

**Hero Visual:**  
A dashboard mockup showing:

```
Georgia
Independent Repair Shops
1,842 shops discovered
613 after-hours opportunities
288 high-volume shops
91 possible shop-management system matches
CSV ready
```

---

### **Section 2: What It Does**

Cards:

| Card | Copy |
| ----- | ----- |
| Google Maps Discovery | Finds repair shops, dealerships, tire shops, body shops, and service centers by state. |
| Website Intelligence | Scans public websites for booking links, text widgets, and software signals. |
| TorQi Fit Scoring | Finds after-hours leaks, busy desks, no-text gaps, and software-fit opportunities. |
| Clean CSV Export | Gives your sales team formatted, filtered, and campaign-ready lead files. |

---

### **Section 3: Built for TorQi Sales**

Show four lead buckets:

```
After-Hours Revenue Leak
Busy Desk / High Call Volume
Pre-Integrated Software Fit
No Text / Weak Booking Flow
```

Each bucket should have a sample sales hook.

---

### **Section 4: Example Output Preview**

A beautiful table preview:

| Shop | State | Rating | Reviews | Closes | Website Signal | TorQi Bucket |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| Peach Auto Care | GA | 4.8 | 612 | 5 PM | Booking link found | Busy Desk |
| Midtown Auto Repair | GA | 4.6 | 219 | Closed Sat/Sun | No text widget | After-Hours Leak |
| Elite Motors Service | GA | 4.9 | 403 | 6 PM | Tekmetric signal | Software Fit |

---

### **Section 5: CTA**

**Headline:**  
**Turn Google Maps into a TorQi-ready sales list.**

Button:  
`Build Territory`

---

# **4\. Main App Pages**

## **4.1 Dashboard Home**

Shows all previous scraping campaigns.

### **Cards**

```
Total Campaigns
Total Leads
Qualified Leads
After-Hours Leads
Software Signals Found
CSV Downloads
```

### **Campaign Table**

| Campaign | State | Category | Leads | Qualified | Status | Created | Action |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| Georgia Repair Shops | GA | Independent Repair Shop | 1,842 | 913 | Complete | Jun 10 | View |
| Texas Dealerships | TX | Dealership Service Dept | 4,122 | 2,044 | Running | Jun 10 | Open |

---

## **4.2 New Scan Page**

This is where the operator creates a campaign.

### **Inputs**

| Input | Example |
| ----- | ----- |
| Campaign Name | Georgia Independent Repair Shops |
| State | Georgia |
| Business Category | Independent Repair Shop |
| Search Queries | auto repair shop, car repair, mechanic |
| Discovery Mode | ZIP Grid / Geo Grid / Hybrid |
| Max Results Per ZIP | 20 / 40 / 60 |
| Website Scan | On / Off |
| JS Browser Scan | Off by default |
| Review Pulling | Off by default |
| Export Format | Full CSV / Sales CSV / Clean CRM CSV |

### **Important**

Use default categories so the operator does not manually type every time.

---

# **5\. Business Categories**

Preload these:

## **Auto Repair**

```
auto repair shop
mechanic
car repair
brake shop
transmission repair
oil change service
tire shop
auto electrical service
diesel repair shop
European auto repair
Japanese auto repair
fleet repair
```

## **Dealership**

```
car dealership
used car dealership
Ford dealership
Toyota dealership
Honda dealership
Chevrolet dealership
Nissan dealership
dealership service center
auto dealer service department
```

## **Collision / Body Shop**

```
auto body shop
collision repair
paint and body shop
dent repair
```

For TorQi, I would start with:

1. Independent repair shops  
2. Dealership service centers  
3. Tire shops  
4. Body shops

Do not start with every category at once. The UI can support it, but sales messaging should remain focused.

---

# **6\. Google Maps Discovery Engine**

## **6.1 Why ZIP/Grid Search**

Google Text Search can return places matching a text query and location bias, but the result set is limited and paginated. Google’s Text Search documentation says you must specify fields using a field mask, and there is no default field list. ([Google for Developers](https://developers.google.com/maps/documentation/places/web-service/text-search?utm_source=chatgpt.com))

So instead of searching:

```
auto repair shops in Georgia
```

The system should search across ZIPs or grid points:

```
auto repair shop near 30301
auto repair shop near 30302
auto repair shop near 30303
...
```

This improves coverage and reduces map clipping.

Do not claim “100% of shops.” Claim:

**“High-coverage state-level discovery.”**

---

## **6.2 Discovery Step: Place IDs Only**

First request should be cheap and narrow.

### **Text Search Field Mask**

```
places.id,nextPageToken
```

The field mask is important because Google’s Places API uses field masks to define what data is returned, and missing masks can cause errors in the new API. ([Google for Developers](https://developers.google.com/maps/documentation/places/web-service/choose-fields?utm_source=chatgpt.com))

### **Save**

```
place_id
query
zip_code
state
source_campaign_id
first_found_at
```

Then deduplicate by `place_id`.

Google’s current service-specific terms say customers may cache Google ID values such as `place_id`, while some other data has stricter caching rules. ([Google Cloud](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_source=chatgpt.com))

---

# **7\. Place Details Enrichment Engine**

After deduplication, call Place Details only for unique Place IDs.

Google Place Details can return address, phone number, ratings, reviews, and other place details once you have a Place ID. ([Google for Developers](https://developers.google.com/maps/documentation/places/web-service/place-details?utm_source=chatgpt.com))

## **Required Place Details Fields**

```
id
displayName
formattedAddress
nationalPhoneNumber
regularOpeningHours
rating
userRatingCount
websiteUri
businessStatus
googleMapsUri
location
primaryType
types
```

## **Do Not Pull at MVP Stage**

Avoid these at first:

```
photos
reviews
generativeSummary
editorialSummary
paymentOptions
parkingOptions
accessibilityOptions
```

Reviews may be useful later, but they can increase cost and complexity. Start with rating and review count only.

---

# **8\. Custom Website Scanner**

This is your own code. No API key.

## **Scanner Flow**

```
Get websiteUri from Google
        ↓
Normalize URL
        ↓
Fetch homepage HTML
        ↓
Extract links, scripts, iframes, forms, visible text
        ↓
Scan homepage
        ↓
Find important internal pages
        ↓
Scan appointment/contact/service pages
        ↓
Detect software, booking, text, chat, forms
        ↓
Save evidence + confidence
```

## **Pages to Scan**

From the homepage, collect links containing:

```
appointment
schedule
booking
book
service
repair
contact
estimate
quote
text
sms
request
```

Limit to maybe 5–10 pages per business to control speed.

---

## **Detection Categories**

### **8.1 Shop-Management / Booking Software Detection**

| Software | Signals |
| ----- | ----- |
| Tekmetric | `tekmetric`, `widget.tekmetric.com`, Tekmetric appointment links |
| Shopmonkey | `shopmonkey`, `shopmonkey.io`, `shopmonkey.cloud` |
| Shop-Ware | `shop-ware`, `shopware`, `shop-ware.com` |
| AutoLeap | `autoleap`, `autoleap.com` |
| Mitchell 1 | `mitchell1`, `shopkeypro`, `managerse` |
| NAPA TRACS | `napatracs`, `tracs` |
| Protractor | `protractorsoftware` |
| RepairPal | `repairpal` |
| Demandforce | `demandforce` |
| Kukui | `kukui` |
| Steer | `steercrm`, `steer` |
| Podium | `podium.com`, text widget |
| Birdeye | `birdeye.com`, review/text widget |
| GoSite | `gosite.com` |

Important: output should be evidence-based, not absolute.

Example:

```
Detected: Tekmetric
Confidence: High
Evidence: widget.tekmetric.com found in iframe
Source Page: /schedule-service
```

---

### **8.2 Text Capability Detection**

Detect:

```
text us
send us a text
sms
message us
chat with us
mobile messaging
```

Also detect widgets:

```
podium
birdeye
livechat
intercom
drift
tawk
crisp
zendesk
```

Output:

```
Text Capability: Found / Not Found / Unclear
Text Evidence: “Text us at...” found on homepage
```

---

### **8.3 Booking Flow Detection**

Detect:

```
Book appointment
Schedule service
Request appointment
Request estimate
Online booking
```

Output:

```
Booking Flow: Strong / Weak / Missing
Booking Type: Form / External widget / Phone-only / Unknown
```

---

### **8.4 Contact Flow Detection**

Look for:

| Signal | Meaning |
| ----- | ----- |
| Phone only | Strong TorQi opportunity |
| Contact form | Medium |
| Appointment form | Better existing workflow |
| Text widget | Lower text-agent opportunity, still voice opportunity |
| Chat widget | Has digital communication, but maybe still weak phone handling |

---

# **9\. JavaScript-Heavy Website Scanner**

Some websites hide widgets until JavaScript loads. For this, add an optional **Playwright scanner**.

This is not a third-party API. It is your own headless browser worker.

## **Use It Only When Needed**

Do not run Playwright on every site by default. It is slower.

Trigger Playwright if:

```
HTML scan finds very little content
website appears React/Wix/Webflow/Squarespace-heavy
homepage has many JS bundles but no clear links
scanner cannot find appointment/contact pages
```

## **Playwright Scan Should Capture**

```
final rendered HTML
network requests
iframe URLs
script URLs
visible text
buttons
links after JS load
```

This will improve detection of embedded booking tools.

---

# **10\. Lead Scoring Engine**

The scoring system should be simple, explainable, and useful for sales.

## **Main Score**

```
TorQi Fit Score: 0–100
```

## **Score Components**

| Component | Points |
| ----- | ----- |
| Closes before/equal 6 PM | \+15 |
| Closed Saturday | \+10 |
| Closed Sunday | \+10 |
| 300+ reviews | \+15 |
| 4.5+ rating | \+10 |
| No text capability found | \+10 |
| Weak/missing booking flow | \+10 |
| Shop software detected | \+15 |
| Phone number available | \+5 |
| Website available | \+5 |
| Business operational | \+5 |

Maximum can exceed 100 internally, then normalize to 100\.

---

## **Lead Grade**

| Score | Grade |
| ----- | ----- |
| 80–100 | A |
| 60–79 | B |
| 40–59 | C |
| 0–39 | D |

---

# **11\. Sales Buckets**

Each lead can have multiple buckets.

## **Bucket 1: After-Hours Revenue Leak**

### **Rules**

```
Closes by 6 PM
OR closed Saturday
OR closed Sunday
```

### **Sales Hook**

```
Your shop closes at [closing time], but repair problems do not wait for business hours. TorQi can answer after-hours calls, capture customer and vehicle details, and prepare the next step before your team opens.
```

---

## **Bucket 2: Busy Desk / High-Volume Shop**

### **Rules**

```
rating >= 4.5
AND userRatingCount >= 300
```

### **Sales Hook**

```
You have the kind of review volume that usually means the front desk is busy. TorQi can handle routine calls, collect details, and reduce pressure on advisors during peak hours.
```

---

## **Bucket 3: Pre-Integrated Software Fit**

### **Rules**

```
Tekmetric / Shopmonkey / Shop-Ware / AutoLeap / Mitchell signal detected
```

### **Sales Hook**

```
We noticed your website appears to use [software]. TorQi can be configured around your existing shop-management workflow instead of forcing your team into a new process.
```

Use “appears to use” unless confirmed.

---

## **Bucket 4: No Text / Weak Digital Intake**

### **Rules**

```
No text signal
AND no appointment form
AND phone-first contact flow
```

### **Sales Hook**

```
Your website sends most customers toward a phone call. TorQi helps make sure those calls are answered, qualified, and organized even when your staff is busy.
```

---

## **Bucket 5: Website Exists, But Conversion Flow Is Weak**

### **Rules**

```
Website exists
BUT no booking link
OR no clear CTA
OR only generic contact page
```

### **Sales Hook**

```
Customers can find you online, but the next step is still mostly manual. TorQi helps turn that interest into a captured lead or booked appointment.
```

---

# **12\. Data Enrichment Fields**

## **Google Maps Fields**

| Column | Source |
| ----- | ----- |
| Place ID | Google |
| Business Name | Google |
| Phone Number | Google |
| Address | Google |
| City | Parsed from address |
| State | Parsed / campaign |
| ZIP | Parsed / campaign |
| Latitude | Google |
| Longitude | Google |
| Google Maps URL | Google |
| Website | Google |
| Business Status | Google |
| Rating | Google |
| Review Count | Google |
| Business Hours | Google |
| Monday Open/Close | Parsed |
| Tuesday Open/Close | Parsed |
| Wednesday Open/Close | Parsed |
| Thursday Open/Close | Parsed |
| Friday Open/Close | Parsed |
| Saturday Open/Close | Parsed |
| Sunday Open/Close | Parsed |
| Closed Weekends | Custom |
| Closes Before 6 PM | Custom |
| After-Hours Gap | Custom |

---

## **Website Scanner Fields**

| Column | Source |
| ----- | ----- |
| Website Scan Status | Custom |
| Website HTTP Status | Custom |
| Final URL | Custom |
| Homepage Title | Custom |
| Appointment Page Found | Custom |
| Contact Page Found | Custom |
| Booking Flow | Custom |
| Booking URL | Custom |
| Text Capability | Custom |
| Text Evidence | Custom |
| Chat Widget Found | Custom |
| Chat Widget Name | Custom |
| Form Found | Custom |
| Form Type | Custom |
| Software Detected | Custom |
| Software Confidence | Custom |
| Software Evidence | Custom |
| Evidence URL | Custom |
| Scanner Notes | Custom |
| Last Website Scan Time | Custom |

---

## **TorQi Sales Fields**

| Column | Source |
| ----- | ----- |
| TorQi Fit Score | Custom |
| Lead Grade | Custom |
| Primary Bucket | Custom |
| Secondary Buckets | Custom |
| Sales Hook | Custom |
| Recommended Opening Line | Custom |
| Outreach Priority | Custom |
| Data Confidence | Custom |
| Rep Notes | Custom |
| Call Status | Manual later |
| Owner Assigned | Manual later |

---

# **13\. CSV Export System**

This part matters. The CSV cannot look like a database dump.

You need multiple export formats.

## **13.1 Full Intelligence CSV**

For admin/team review.

Includes everything:

```
Google fields
website scan fields
software detection
scores
buckets
evidence
scanner status
```

---

## **13.2 Sales Outreach CSV**

For sales reps.

Keep it clean.

### **Columns**

```
Business Name
Phone Number
Website
City
State
Rating
Review Count
Closes At
Closed Weekends
Primary Bucket
TorQi Fit Score
Lead Grade
Software Detected
Sales Hook
Opening Line
Evidence
Google Maps URL
```

---

## **13.3 CRM Import CSV**

For future CRM upload.

### **Columns**

```
Company Name
Phone
Website
Address
City
State
ZIP
Lead Source
Lead Category
Lead Score
Lead Grade
Primary Pain Point
Detected Software
Notes
Owner
Status
```

---

## **13.4 Software-Fit CSV**

For only software-detected leads.

### **Columns**

```
Business Name
Phone
Website
Detected Software
Confidence
Evidence URL
Evidence Text
Rating
Review Count
Sales Hook
```

---

## **13.5 After-Hours CSV**

For after-hours campaign.

### **Columns**

```
Business Name
Phone
Website
Weekday Closing Time
Saturday Status
Sunday Status
After-Hours Gap Type
TorQi Hook
```

---

# **14\. UI Design Plan**

TorQi already has a premium AI-business feel. The scraper UI should follow that, not look like a rough admin panel.

## **Visual Style**

| Element | Direction |
| ----- | ----- |
| Background | Clean white / light gray |
| Primary color | TorQi navy |
| Accent | TorQi orange |
| Cards | Rounded, soft shadows |
| Tables | Clean, sortable, sticky header |
| Status | Badges and progress bars |
| Charts | Minimal, business dashboard style |
| Typography | Modern SaaS style |

---

## **Main Dashboard UI Components**

### **Top Summary Cards**

```
Total Leads Found
Qualified Leads
A-Grade Leads
After-Hours Leads
Software Signals
CSV Downloads
```

### **Campaign Progress Bar**

```
Discovery: 100%
Place Details: 82%
Website Scan: 44%
Scoring: Waiting
CSV: Not Ready
```

### **Lead Distribution Chart**

```
After-Hours Leak: 613
Busy Desk: 288
Software Fit: 91
Weak Booking Flow: 422
```

### **Lead Table**

Features:

```
Search
Filter by state
Filter by city
Filter by grade
Filter by bucket
Filter by software
Filter by rating
Filter by review count
Filter by website scan status
Sort by score
Export selected
Export all
```

---

# **15\. Lead Detail Page**

Every lead should have a detail page.

## **Header**

```
Peach Auto Care
A-Grade Lead
TorQi Fit Score: 87
Primary Bucket: Busy Desk
```

## **Sections**

### **Business Info**

```
Phone
Website
Address
Google Maps URL
Rating
Review Count
Business Status
```

### **Hours Analysis**

```
Monday: 8 AM–5 PM
Tuesday: 8 AM–5 PM
...
Saturday: Closed
Sunday: Closed

After-Hours Signal:
Strong
```

### **Website Intelligence**

```
Booking Page: Found
Text Capability: Not Found
Chat Widget: Not Found
Detected Software: Tekmetric
Confidence: High
Evidence: widget.tekmetric.com
```

### **Sales Recommendation**

```
Opening Line:
“Hey, I saw your shop has strong review volume and closes around 5 PM. TorQi helps shops like yours answer after-hours and overflow calls without adding front-desk pressure.”
```

### **Data Quality**

```
Google Data: Good
Website Scan: Good
Software Detection: High confidence
Last Refreshed: June 10, 2026
```

---

# **16\. Campaign Status System**

Every campaign should have clear statuses.

```
Draft
Queued
Discovering Places
Deduplicating
Fetching Details
Scanning Websites
Running JS Scan
Scoring Leads
Generating CSV
Complete
Completed With Warnings
Failed
Paused
```

---

# **17\. Error Handling**

Do not let one bad website break the whole campaign.

## **Common Errors**

| Error | Handling |
| ----- | ----- |
| Google API quota issue | Pause campaign, show error |
| Website timeout | Mark `scan_timeout` |
| Website blocked | Mark `blocked_or_forbidden` |
| SSL error | Mark `ssl_error` |
| No website | Skip scanner |
| Duplicate Place ID | Merge |
| Missing phone | Keep lead, lower score |
| Business closed | Exclude or mark low priority |
| JS scanner failed | Keep HTML scan result |

---

# **18\. Data Quality Score**

Add a separate score:

```
Data Confidence Score: 0–100
```

## **Example Rules**

| Signal | Points |
| ----- | ----- |
| Phone found | \+20 |
| Website found | \+20 |
| Hours found | \+20 |
| Rating/review count found | \+10 |
| Website scan successful | \+20 |
| Software evidence found | \+10 |

This helps sales know which leads are reliable.

---

# **19\. Database Schema**

## **campaigns**

```
id
name
state
business_category
search_queries
status
total_zips
processed_zips
total_place_ids
unique_place_ids
total_enriched
total_scanned
total_qualified
created_by
created_at
updated_at
completed_at
```

---

## **places\_raw**

```
id
campaign_id
place_id
query
zip_code
state
first_seen_at
duplicate_count
```

---

## **leads**

```
id
campaign_id
place_id
business_name
phone
website
address
city
state
zip
latitude
longitude
google_maps_url
business_status
rating
review_count
primary_type
types
hours_json
weekday_close_time
closed_saturday
closed_sunday
closes_before_6
created_at
updated_at
```

---

## **website\_scans**

```
id
lead_id
scan_status
http_status
final_url
homepage_title
pages_scanned
appointment_page_found
appointment_url
contact_page_found
contact_url
booking_flow_strength
text_capability
text_evidence
chat_widget_found
chat_widget_name
form_found
detected_software
software_confidence
software_evidence
evidence_url
raw_signals_json
scan_started_at
scan_finished_at
```

---

## **lead\_scores**

```
id
lead_id
torqi_fit_score
lead_grade
data_confidence_score
primary_bucket
secondary_buckets
sales_hook
opening_line
outreach_priority
score_breakdown_json
created_at
updated_at
```

---

## **exports**

```
id
campaign_id
export_type
file_name
file_path
row_count
created_at
created_by
```

---

# **20\. API Routes**

## **Campaign**

```
POST /api/campaigns
GET /api/campaigns
GET /api/campaigns/:id
POST /api/campaigns/:id/start
POST /api/campaigns/:id/pause
POST /api/campaigns/:id/resume
POST /api/campaigns/:id/cancel
```

## **Leads**

```
GET /api/campaigns/:id/leads
GET /api/leads/:id
PATCH /api/leads/:id
```

## **Scanner**

```
POST /api/campaigns/:id/scan-websites
POST /api/leads/:id/rescan-website
```

## **Exports**

```
POST /api/campaigns/:id/export/full
POST /api/campaigns/:id/export/sales
POST /api/campaigns/:id/export/crm
POST /api/campaigns/:id/export/software-fit
POST /api/campaigns/:id/export/after-hours
GET /api/exports/:id/download
```

---

# **21\. Processing Pipeline**

## **Stage 1: Campaign Creation**

Operator chooses:

```
State: Georgia
Category: Independent Repair Shop
Queries:
- auto repair shop
- mechanic
- car repair
- brake shop
```

System loads ZIPs from your own internal ZIP dataset.

---

## **Stage 2: Google Text Search**

For each ZIP \+ query:

```
textQuery: "auto repair shop near 30301"
fieldMask: places.id,nextPageToken
```

Save Place IDs.

---

## **Stage 3: Deduplication**

Deduplicate by:

```
place_id
```

Optional secondary dedupe:

```
same phone
same website
same business name + address
```

---

## **Stage 4: Place Details**

For each unique Place ID, fetch only needed fields.

```
id
displayName
formattedAddress
nationalPhoneNumber
regularOpeningHours
rating
userRatingCount
websiteUri
businessStatus
googleMapsUri
location
primaryType
types
```

---

## **Stage 5: Hours Analysis**

Parse hours into:

```
weekday_open_time
weekday_close_time
saturday_status
sunday_status
closes_before_6
after_hours_gap
```

---

## **Stage 6: Website Scanner**

For each website:

```
fetch homepage
extract links
select important pages
scan HTML
scan scripts
scan iframes
scan forms
detect signals
```

---

## **Stage 7: Optional JS Scan**

Only run Playwright if HTML scan is weak or unclear.

---

## **Stage 8: Scoring**

Calculate:

```
TorQi Fit Score
Lead Grade
Primary Bucket
Secondary Buckets
Data Confidence
Sales Hook
Opening Line
```

---

## **Stage 9: CSV Generation**

Generate all export types.

---

# **22\. Formatting Rules**

## **Phone Number**

Format US numbers like:

```
(404) 555-0198
```

Also store raw version.

---

## **Website**

Normalize:

```
https://example.com
```

Remove tracking parameters.

---

## **Business Name**

Clean:

```
PEACH AUTO CARE LLC
```

to:

```
Peach Auto Care LLC
```

Do not over-clean legal names.

---

## **Hours**

Convert raw Google hours into simple fields:

```
Monday Open
Monday Close
Tuesday Open
Tuesday Close
...
```

Also generate:

```
Readable Hours Summary
```

Example:

```
Mon–Fri 8 AM–5 PM, Sat Closed, Sun Closed
```

---

## **Buckets**

Do not output ugly machine labels.

Bad:

```
AFTER_HOURS_REVENUE_LEAK
```

Good:

```
After-Hours Revenue Leak
```

---

# **23\. CSV Example**

```
Business Name,Phone,Website,City,State,Rating,Review Count,Hours Summary,Primary Bucket,TorQi Fit Score,Lead Grade,Software Detected,Sales Hook,Google Maps URL
Peach Auto Care,(404) 555-0198,https://peachautocare.com,Atlanta,GA,4.8,612,"Mon-Fri 8 AM-5 PM, Sat Closed, Sun Closed",Busy Desk / High-Volume Shop,87,A,Tekmetric,"Your shop has strong review volume and closes at 5 PM. TorQi can help answer after-hours and overflow calls.",https://maps.google.com/...
```

---

# **24\. Compliance Layer**

Even though this is an internal scraper, add compliance fields now.

## **Fields**

```
Outreach Status
Do Not Contact
Opted Out
Last Contacted
Contact Method
Manual Call Only
Notes
```

I would avoid automated cold SMS or AI outbound calling until legal review. Use the tool first for research, prioritization, manual sales calling, and controlled email outreach.

---

# **25\. Google Data Policy Notes**

Store `place_id` as the permanent Google reference. Refresh business details regularly instead of treating old Maps data as permanent. Google’s terms discuss caching Google ID values such as Place IDs, while some fields like latitude/longitude have time-limited caching rules. ([Google Cloud](https://cloud.google.com/maps-platform/terms/maps-service-terms?utm_source=chatgpt.com))

Practical rule:

| Data | Storage Approach |
| ----- | ----- |
| Place ID | Store long-term |
| Your own scores | Store long-term |
| Website scan result | Store long-term |
| Software evidence from public website | Store long-term |
| Google rating/hours/phone | Refresh periodically |
| Latitude/longitude | Be careful; refresh or limit caching per policy |

---

# **26\. Cost-Control Rules**

Use a two-step pipeline:

## **Step 1: Search**

Only request:

```
places.id,nextPageToken
```

## **Step 2: Details**

Only request:

```
id
displayName
formattedAddress
nationalPhoneNumber
regularOpeningHours
rating
userRatingCount
websiteUri
businessStatus
googleMapsUri
location
primaryType
types
```

Do not use `*` in production. Google’s field-mask documentation recommends requesting only necessary fields because field masks help reduce cost and latency. ([Google for Developers](https://developers.google.com/maps/documentation/places/web-service/choose-fields?utm_source=chatgpt.com))

---

# **27\. Admin Settings Page**

Add a settings page for control.

## **Settings**

```
Google Maps API Key
Max ZIPs per campaign
Max queries per ZIP
Max websites scanned per minute
Website timeout seconds
Enable JS scan
Enable review pulling
Default export format
Excluded domains
Excluded business names
Excluded business statuses
```

---

# **28\. Security**

## **Must-have**

```
API key stored server-side only
Never expose Google API key in frontend
Rate limit internal endpoints
Admin login
Campaign audit logs
CSV access logs
```

If you show a map on the frontend, that may need client-side Google Maps usage. But for the scraping engine, keep the Places API key server-side.

---

# **29\. MVP Build Plan**

## **MVP 1: Core Scraper**

Build:

```
Landing page
New campaign page
State/category input
ZIP loader
Google Text Search
Place ID dedupe
Place Details enrichment
Lead table
CSV export
```

No website scanner yet.

---

## **MVP 2: Website Intelligence**

Add:

```
Homepage scanner
Appointment/contact page scanner
Software detection
Text widget detection
Booking flow detection
Evidence capture
```

---

## **MVP 3: Scoring \+ Sales Buckets**

Add:

```
TorQi Fit Score
Lead Grade
Primary Bucket
Sales Hook
Opening Line
Data Confidence Score
```

---

## **MVP 4: Beautiful Dashboard**

Add:

```
Campaign analytics
Charts
Filters
Lead detail page
Export variants
Scan status tracker
```

---

## **MVP 5: Playwright Scanner**

Add only after the basic scanner works.

```
JS-rendered pages
Network request capture
Iframe capture
Dynamic widget detection
```

---

# **30\. Final System Flow**

```
User opens TorQi Territory Builder
        ↓
Creates campaign:
State + category + search terms
        ↓
System loads internal ZIP database
        ↓
Google Places Text Search runs by ZIP/query
        ↓
Only Place IDs are collected
        ↓
Duplicates are removed
        ↓
Google Place Details enriches each unique shop
        ↓
System parses phone, hours, rating, website, location
        ↓
Custom website scanner checks public website
        ↓
Software/text/booking/contact signals are detected
        ↓
Lead scoring engine assigns TorQi Fit Score
        ↓
System assigns sales buckets and hooks
        ↓
Dashboard shows insights
        ↓
User filters leads
        ↓
User downloads clean CSV
```

---

# **Final Verdict**

This plan is solid with your constraint:

**Only one external data API: Google Maps API.**

Everything else can be custom:

```
Website scanner
Software detector
Lead scorer
CSV formatter
Dashboard
Landing page
Database
Campaign manager
Sales hook generator
Data quality engine
```

Build it as **TorQi Territory Builder**, not just “Map Data Scraper.”

That positioning matters. A scraper sounds cheap. A territory builder sounds like a sales intelligence product.

