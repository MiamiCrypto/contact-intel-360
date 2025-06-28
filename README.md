# Product Requirements Document (PRD)

## Title
**Contact Intelligence 360**  
Client: Gentcs.ai • Internal Product Owner: Blue Team

**Company & Project Validation + Deep Contact Intelligence App**  
**Client:** Gentcs.ai • **Internal Product Owner:** Blue Team

## Revision History
| Date | Version | Author(s) | Notes |
|------|---------|-----------|-------|
| 2025-06-24 | 0.2 | Ramon Castro & Patt | Added stakeholders |
| 2025-06-24 | 0.3 | Ramon Castro & Patt | Inserted Data-Flow Pipeline |
| 2025-07-02 | **1.0 (FINAL)** | Ramon Castro & Patt | All TBD fields closed |
| 2025-07-02 | 1.1 | Ramon Castro & Patt | Switched extractor from Firecrawl to Playwright |
| 2025-07-02 | 1.2 | Ramon Castro & Patt | Standardized on Playwright (removed Puppeteer) |

---

## 1 · Overview
A **two-phase workflow**  
1. **Extraction Stage** – Scrape company URLs with a headless **Playwright** cluster (self-hosted or Apify actor) → immediately write a normalized **CSV** (`company_people_raw.csv`). JSON is only stored for debugging when needed.  
2. **Validation & Enrichment Stage** – Ingest the CSV, resolve entities, enrich contacts (LinkedIn, email, phone, golf status, etc.), and surface results in a review dashboard.  

Primary use-cases: accelerate sales prospecting, confirm partner involvement in construction projects, and surface warm-intro angles (e.g., shared golf interests).

---

## 2 · Goals & Success Metrics
| KPI | Target |
|-----|--------|
| Company / project validation accuracy | **≥ 95 %** |
| Contact-enrichment coverage (LinkedIn + email + phone) | **≥ 85 %** |
| Throughput (1 k rows) | **< 10 min** from upload to export |
| User satisfaction (pilot survey) | **≥ 4.5 / 5** |

---

## 3 · Stakeholders & Roles
| Role | Name | Responsibilities |
|------|------|------------------|
| Client | Gentcs.ai | Provides seed CSVs, signs off on deliverables |
| Product & Engineering Lead | **Ramon Castro** | Roadmap, architecture, FE implementation |
| Data/ML Lead | **Patt** | Entity resolution, scraping, enrichment logic |
| QA / DevOps | **Blue Team DevOps** | CI/CD, environments, load testing |

---

## 4 · User Personas
1. **Sales Analyst** – cleans lead lists, triggers enrichment, exports CSVs for outreach.  
2. **BD Manager** – explores enriched contacts for strategic introductions.  
3. **Project Coordinator** – validates active construction projects and partner roster.  

---

## 5 · Scope
### In-scope
* **Website extraction to CSV** – Playwright scraper of leadership pages; produce `company_people_raw.csv`.  
* CSV ingestion & schema mapping (see Appendix A for schemas).  
* Entity resolution (company ↔ project ↔ person).  
* Contact enrichment (LinkedIn, email, phone, golf, press mentions).  
* Dashboard UI with confidence badges & inline edit.  
* Role-based access (Client vs Internal).  
* Export: **CSV** download (JSON optional for API debug) + REST endpoint.  

### Out-of-scope (Phase 2+)
* Real-time social-media monitoring.  
* Predictive scoring / lead-ranking models.  

---

## 6 · Functional Requirements
0. **Web Extraction to CSV** – Accept one or more company URLs; a Playwright worker renders leadership pages, parses headings, and outputs `company_people_raw.csv`. JSON files optional for troubleshooting only.  
1. **CSV Upload** – ≤ 50 MB, delimiter auto-detect, schema preview, duplicate row detection.  
2. **Entity Resolution Engine** – fuzzy match (Jaro-Winkler ≥ 0.92) + Clearbit firmographics.  
3. **Key-People Discovery** – If any people missing in CSV, trigger incremental scrape; rank executives.  
4. **Deep-Research Agent** – OpenAI function calling; enrich each person with LinkedIn, work email, phone, golf association, press quotes.  
5. **Project Validation Module** – search industry DBs (ENR, Dodge) + scraping to confirm status & partners.  
6. **Review UI** – list, grid, and diff views; confidence pill (High ≥ 0.95, Medium 0.85-0.95, Low < 0.85).  
7. **Export & Reporting** – one-click CSV download; dashboard metrics (records processed, error rows).  

*(Data-Flow Pipeline table retained in Appendix B)*  

---

## 7 · Non-Functional Requirements
| Category | Requirement |
|----------|-------------|
| Security | AES-256 at rest (Supabase), HTTPS/TLS 1.3, GDPR Art. 28 DPA executed |
| Privacy | Personal emails hashed at rest; only last-four of phone visible in UI by default |
| Performance | 1 k rows < 10 min; web UI first meaningful paint < 2 s on 4G |
| Reliability | **99.5 %** uptime SLA; Sentry error alerting; daily backups |
| Compliance | Review against CCPA & CAN-SPAM for outreach data |
| Observability | Structured logs (JSON) + Prometheus metrics; Grafana dashboards |

---

## 8 · Data Sources & Licenses
| Provider | Purpose | Quota / Cost | License Status |
|----------|---------|-------------|----------------|
| Playwright Cluster | Web scraping | EC2 t3.medium + proxy pool ≈ $25/mo | Self-hosted (approved) |
| OpenAI o3 | LLM analysis | 300 k tokens/day | Paid plan, $200/mo cap |
| Clearbit Enrich | Firmographic | 2 k calls/mo | Approved |
| Crunchbase API | Projects data | 5 k calls/mo | Approved |
| Hunter.io | Email discovery | 6 k verifications/mo | Approved |
| People Data Labs | Phone numbers | 2 k records/mo | PO pending |
| USGA GHIN API | Golf affiliations | 10 k requests/mo | Approved |

---

## 9 · System Architecture
```mermaid
flowchart LR
    subgraph Frontend
        A[React + Chakra UI] --REST--> B(API Gateway)
    end
    subgraph Backend
        B --> C(Node Express)
        C -->|Queue| D[Redis]
        C -->|Query| E[Supabase DB]
    end
    subgraph Workers
        D --> F[Playwright Scraper]
        D --> G[OpenAI Agent]
        D --> H[Enrichment Adapters]
    end
    E --> I[Grafana + Metabase]