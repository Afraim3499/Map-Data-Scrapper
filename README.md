# TorQi Territory Builder 🏎️💨

TorQi Territory Builder is an internal sales-intelligence web application designed to turn Google Maps business listings into a clean, enriched, scored, and CSV-ready lead database for TorQi's auto repair and dealership sales team.

## Project Description

> **TorQi Territory Builder** is a serverless-optimized sales intelligence app that extracts Google Maps business listings, runs custom website audits, checks booking systems, and scores leads (A–D grades) into a clean, CSV-ready dashboard for auto repair sales teams.

---

## 🚀 Key Features

* **Zip-Code Campaign Scheduler:** Launch searches across 41,554 US ZIP codes by state and categories (e.g., auto repair shops, mechanics).
* **Google Maps/Places Enrichment:** Pulls geolocation, review scores, operating hours, and contact information.
* **Custom Website Scanner:** Parses websites using Cheerio (with strict IPv4 & IPv6 SSRF controls) to identify software stacks, text capabilities, and booking widgets.
* **Lead Scorer & Sales Hook Generator:** Grades leads (A, B, C, or D) based on business scheduling gaps (e.g., "closes before 6 PM") and website capabilities.
* **Serverless Tick Executor:** Runs processing steps in tiny, discrete execution increments to maintain compatibility with serverless (Vercel) timeout limits.
* **CSV Leads Exporter:** Instantly download filtered sales leads formatted for CRM import.

---

## 🛠️ Technology Stack

* **Framework:** Next.js (App Router, React 19)
* **Database & ORM:** Prisma 7 with PostgreSQL (Supabase)
* **CSS & Styling:** Vanilla CSS (vibrant dark-mode theme, tailored glassmorphism)
* **Web Scraper:** Custom Cheerio scanner with DNS/IP resolution SSRF protection

---

## ⚙️ Local Setup

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Supabase direct connection for local CLI migrations
DATABASE_URL="postgresql://postgres.your_id:your_password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Google Maps API Key
GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
```

### 4. Push Database Schema
Prisma 7 uses the configuration in `prisma.config.ts` to manage migrations. Sync your Supabase database schema directly:
```bash
npx prisma db push
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Vercel Deployment

When deploying to **Vercel**, link your repository and configure the following Environment Variables in the Vercel Dashboard:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.your_id:your_password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres` | Use port **`6543`** (Supabase Connection Pooler) for serverless scalability. Remember to URL-encode special password characters (e.g., `?` becomes `%3F`). |
| `GOOGLE_MAPS_API_KEY` | `AIzaSy...` | Your Google API Key. |

---

## 🛡️ SSRF Security Protections
The crawler incorporates strict SSRF validation by resolving hostnames to IPs and blocking loopbacks, link-local addresses, and private subnets:
* **IPv4 Blocks:** `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`.
* **IPv6 Blocks:** `::1` (loopback), `fe80::/10` (link-local), `fc00::/7` (unique local).
* Handles IPv4-mapped IPv6 address blocks (`::ffff:x.x.x.x`) automatically.
