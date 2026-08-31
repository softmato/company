# Graph Report - company  (2026-08-31)

## Corpus Check
- 371 files · ~390,924 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1856 nodes · 3759 edges · 105 communities (99 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `normalized-for-git`
- Commit-specific freshness metadata is normalized for stable Git diffs.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 94|Community 94]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 78 edges
2. `[Unreleased]` - 50 edges
3. `metadataFor()` - 35 edges
4. `getPage` - 35 edges
5. `[Phase 1] — 2026-08-14` - 33 edges
6. `siteUrl()` - 27 edges
7. `breadcrumbList()` - 24 edges
8. `PaymentError` - 21 edges
9. `recordAudit()` - 20 edges
10. `prefersReducedMotion()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `submitContact()` --calls--> `headers`  [INFERRED]
  apps/web/app/(public)/(site)/contact/actions.ts → packages/db/tests/ledger.test.ts
- `failure()` --calls--> `isPaymentError()`  [INFERRED]
  apps/web/app/(admin)/admin/products/actions.ts → packages/payment-core/errors.ts
- `registerApplicationAction()` --calls--> `registerApplication()`  [INFERRED]
  apps/web/app/(admin)/admin/products/actions.ts → packages/payment-core/applications/manage.ts
- `rotateSecretAction()` --calls--> `rotateSecret()`  [INFERRED]
  apps/web/app/(admin)/admin/products/actions.ts → packages/payment-core/applications/manage.ts
- `revokeApplicationAction()` --calls--> `revokeApplication()`  [INFERRED]
  apps/web/app/(admin)/admin/products/actions.ts → packages/payment-core/applications/manage.ts

## Communities (105 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (95): AboutPage(), generateMetadata(), dmSans, inter, metadata, outfit, plexMono, NotFound() (+87 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (59): ContactResult, schema, submitContact(), ContactNotification, notifyContact(), hashIp(), isRateLimited(), DEFAULT_MAILBOXES (+51 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (47): BlogPostSeed, blogPostSeeds, PageSeed, pageSeeds, ProductPageSeed, productPageSeeds, ServiceSeed, serviceSeeds (+39 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (40): TotpSetup(), confirmEnrolment(), EnrolPage(), metadata, openPendingSecret(), seal(), sealPendingSecret(), qrSvg() (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (34): uploadCmsImage(), UploadResult, describedBy(), FieldShell(), ImageField(), MarkdownField(), TagsField(), TextField() (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (46): 0. How to use this brief, 1. What this product is, 2. Palette — soil ⚠ SUPERSEDED, 3.1 Public site — `softmato.com`, 3.2 Admin panel — `admin.softmato.com`, 3.3 Checkout — `payment.softmato.com`, 3.4 Client portal — `agency.softmato.com`, 3. Page inventory (+38 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (46): Added, Added, Added, Added, Added, Added, Added, Added (+38 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (32): Customer, customers, Invoice, InvoiceLine, invoiceLines, invoices, invoiceStatus, deliveryStatus (+24 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (40): 10. Reconciliation targets, 11. Open items for the accountant, 1. Account numbering, 2. Assets, 3. Liabilities, 4. Equity, 5. Revenue, 6. Direct costs (+32 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (26): AccountingError, allocateDocumentNo(), allocateSequence(), COLUMN, formatDocumentNo(), SequenceKind, TABLE, WIDTH (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (21): optionalText, requiredText, SEO_FIELDS, seoSchema, slugSchema, SORT_ORDER_FIELD, sortOrderSchema, tagsSchema (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (22): FiscalPeriod, fiscalPeriods, periodStatus, entryDirection, journalEntries, JournalEntry, journalSource, ledgerEntries (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (33): 1. Conventions, 2. Authentication, 3. Endpoints, 4. Outbound webhooks, 5.1 `manual_qr`, 5.1 `manual_qr` — **removed 2026-08-16**, 5.2 Khalti (KPG v2), 5.3 eSewa (+25 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (33): Added, Added, Added, Added, Added, Added, Added, Added (+25 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (29): 1. Principles, 2.1 A journal cannot commit unbalanced, 2.2 Ledger rows are immutable, 2.3 Closed periods reject postings, 2.4 An admin cannot exist without 2FA, 2. The four guarantees, 3. Ledger structure, 4. Tables that carry the most weight (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (32): 10. Quality floor, 11. Before adding anything visual, 1. Direction: the ledger, 1. Direction: warm paper, quiet emerald, 1. Direction: white, black and emerald, 2. Palette, 3. Typography, 4. The signature: greenbar tables (+24 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (22): DeviceScreen(), PrinciplesSection(), ProductsSection(), CLOSING_HEADING, PRINCIPLES_HEADING, PRODUCTS_HEADING, SERVICES_HEADING, STATEMENT (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (21): NUMERIC_FIELDS, FilterLink(), Chip(), PostList(), PostSummary, formatAd(), formatBsNumeric(), cn() (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (16): RotateTotpForm(), RotateTotpFormProps, SubmitButton(), TotpSetupProps, Button(), ButtonSize, ButtonVariant, SIZES (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (28): 10. Comments, 11. Commits, 12. Formatting, 1. TypeScript, 2. Money in code, 3. Validation, 4. Database access, 5. API routes (+20 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (20): isPaymentError(), PAYMENT_ERROR_STATUS, PaymentError, PaymentErrorCode, PUBLIC_MESSAGE, assertTransition(), canTransition(), isPayable() (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (20): Glyph(), IconBell(), IconCamera(), IconDownload(), IconFingerprint(), IconHome(), IconOffline(), IconPin() (+12 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (17): encodeRandom(), encodeTime(), newRequestId(), apiError(), apiJson(), toPaymentError(), ApiContext, mutatingEndpoint() (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (19): Account, accountClass, normalBalance, Product, productKind, products, Application, APPLICATION_SCOPES (+11 more)

### Community 24 - "Community 24"
Cohesion: 0.1
Nodes (13): closeDb(), db, DbLike, DbTx, isNeon, draft, effectiveAt, live (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.1
Nodes (21): Blocked on external parties, Blocked on the founder, code:bash (pnpm install && pnpm dev      # localhost:3000, admin.localh), code:markdown (### Session N — YYYY-MM-DD), Current status, Decisions made, Deviations from the docs, Memory (+13 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (21): 10. Reading order if more depth is needed, 1. The company shape (this drives every decision), 2. Why a product talks to the parent platform at all, 3. The integration contract, 4. Why the callback exists, and why a redirect is not it, 5. What happens to the money on our side, 6. The guarantees the database enforces, 7. Finance operations around the billing flow (+13 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (12): Eclipse(), Orb(), FORM_COLORS, KATHMANDU, PointGlobe(), Showcase(), useIdleSpin(), SURFACES (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.1
Nodes (20): 10. Before accepting any phase, 11. What not to test, 1. Stack, 2. Ledger — must pass before any provider goes live, 3. Idempotency, 4. Forgery and trust, 5. Amount integrity, 6. Authorization (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (13): SETTING_DEFINITIONS, SETTING_GROUPS, SETTING_KEYS, SettingDefinition, SettingKind, BY_KEY, definitionFor(), resolve() (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (15): authenticateApplication(), AuthenticatedApplication, bearerToken(), matchSecret(), unauthenticated(), CreatedSession, createSession(), CreateSessionInput (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.1
Nodes (19): 1. The company, 2. The problem, 3. What we're building, 4. Users, 5.1 Public site, 5.2 Payment platform, 5.3 Accounting, 5.4 Subscriptions (+11 more)

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (12): covering, DarkNavZone(), ServicesChapter(), ServicesSection(), MarkCircle(), BlurIn(), LightForm(), LightFormScene (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (8): SmoothScroll(), NAV_LINKS, SiteFooter(), LINKS, SiteHeader(), Wordmark(), CheckoutPage(), buttonClasses()

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (16): assertRevenueAccounts(), defaultRevenueAccount(), assertLines(), assertServiceWindow(), CreatedInvoice, createInvoice(), CreateInvoiceInput, CustomerInput (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (15): hasProvider(), providerAdapter(), registeredProviders(), registerProvider(), REGISTRY, resetProviderRegistry(), InitiateResult, isProviderId() (+7 more)

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (18): 1. Local setup, 2. Variables, 3. File storage, 4. Environments, 5. Deployment, 6. Cron, 7. Cost, 8. Secrets (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.2
Nodes (16): requireAdmin(), IssuedCredential, registerApplication(), RegisterInput, revokeApplication(), rotateSecret(), RotationResult, updateApplication() (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (8): ApplicationPanel(), RegisterApplicationForm(), DESCRIPTION, ScopeCheckboxes(), ApplicationSummary, listProductsWithApplications(), ProductWithApplications, ProductsPage()

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): CraftConstellation(), CRAFT_DISCS, CraftDisc, DisciplineCluster(), Discipline, DISCIPLINES, Satellite, RecentPosts() (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (9): BLOOM_LAYERS, EXIT_DX, HeroArc(), CRESCENT_LAYERS, HeroEye(), EXIT_DX, heroStart(), HERO (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.42
Nodes (12): drawApp(), drawDesign(), bar(), fillRound(), ground(), label(), roundRect(), strokeRound() (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (17): 1. Shape of the system, 2. The central payment principle, 3. Payment flow, end to end, 4. Package boundaries, 5. Data flow into the ledger, 6. Background work, 7. Trust boundaries, 8. Why this shape (+9 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (11): ContentForm(), PublicationPanel(), PublishConfirm(), PublishPending(), StatusBadge(), Field(), Badge(), BadgeTone (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (10): AuditActorType, AuditEntry, recordAudit(), redact(), REDACTED_KEYS, authorize(), credentialsSchema, { handlers, auth, signIn, signOut } (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.3
Nodes (9): aup, cookies, legalDocumentSeeds, privacy, refunds, body(), LegalDocumentSeed, sla (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.19
Nodes (14): buildReceipt(), Receipt, ReceiptInput, ReceiptSender, sendReceipt(), INPUT, receipt, clearInvoice() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (16): `apps/web`, code:block1 (softmato/), code:block2 (apps/web/), code:block3 (db/), code:block4 (payment-core/), code:block5 (accounting/), code:block6 (sdk/), code:block7 (ui/) (+8 more)

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (11): ClosingCta(), Hero(), PLACE_COORDINATES, PLACE_PHOTO, PlaceSection(), homeTagline(), collapse(), splitLede() (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.28
Nodes (6): ToneSegment, ToneSentence, TextTag, prefersReducedMotion(), registerMotionPlugins(), TextTag

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (4): PageContainer(), Skeleton(), Toast, ToastContext

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (13): expireIfDue(), loadPayableSession(), loadSession(), assertOffered(), selectProvider(), transitionSession(), displayable(), liveAttempt() (+5 more)

### Community 52 - "Community 52"
Cohesion: 0.35
Nodes (11): publishContent(), unpublishContent(), saveContent(), ActionResult, databaseMessage(), parseId(), requireKind(), getContent() (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.16
Nodes (10): audited, entry, makePayable(), NOW, PERIOD_ENDS, PERIOD_STARTS, receipts, sent (+2 more)

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (11): accounts, transactions, PaymentProvider, paymentProviders, ReconciliationItem, reconciliationItems, ReconciliationRun, reconciliationRuns (+3 more)

### Community 55 - "Community 55"
Cohesion: 0.14
Nodes (13): 1. The shared Softmato domain, 2.1 Where replies go, 2. Categories — which mailbox a message comes from, 3. Where the sender is configured, 4. Template structure, 5.1 Contact enquiry, 5.2 Payment receipt, 5. Triggers (+5 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (13): 1. When to stop and ask, 2. Money — absolute rules, 3. Never weaken a constraint, 4. Libraries, 5. Error handling, 6. Security, 7. Wrong even if it works, 8. Working method (+5 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (12): Ongoing after each phase, Phase 1 — Foundation, Phase 2 — Public site + CMS, Phase 3 — Payment core, Phase 3 — Payment core + manual QR, Phase 4 — Khalti, Phase 5 — eSewa, Phase 6 — Invoicing + subscriptions (+4 more)

### Community 58 - "Community 58"
Cohesion: 0.26
Nodes (11): assertKeyShape(), canonical(), HandlerResult, hashRequest(), IdempotentOutcome, IdempotentRequest, isIdempotencyKeyViolation(), read() (+3 more)

### Community 59 - "Community 59"
Cohesion: 0.18
Nodes (9): call(), loaded, msg, [name, urlPath = '/', scrollArg = '0', width = '1440', height = '900'], pending, PORT, send(), waiters (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.18
Nodes (10): 1. Palette, 2. Type, 3. Money and dates, 4. Component metrics (shadcn defaults, restyled), 5. The banded table, 6. Motion, 7. Screens in the file, 8. Behaviour worth copying exactly (+2 more)

### Community 61 - "Community 61"
Cohesion: 0.18
Nodes (10): code:block1 (marketplace: claude-video   (github: bradautomates/claude-vi), code:block2 (/watch "C:/Users/Aanand/Downloads/some-video.mp4" what happe), code:bash (PYTHONIOENCODING=utf-8 python \), code:bash (node scripts/shot.mjs hero /            0     1440 900   # v), How to use it, Related: seeing the site itself, Setup state, Three things a fresh session needs to know (+2 more)

### Community 62 - "Community 62"
Cohesion: 0.27
Nodes (7): Breadcrumbs(), ContentTable(), SettingsForm(), listContent(), ContentListPage(), SettingsPage(), getStoredSettings()

### Community 63 - "Community 63"
Cohesion: 0.36
Nodes (5): BuildTiers(), TierRow(), Tier, TIERS, TierSide

### Community 64 - "Community 64"
Cohesion: 0.32
Nodes (5): QUALITIES, Quality, QualityPile(), TONE_CLASS, PillPile()

### Community 65 - "Community 65"
Cohesion: 0.36
Nodes (5): AdminNav(), NavItem, SECTIONS, AdminLayout(), initials()

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (5): TRUSTED_IMAGE_HOSTNAMES, loadRootEnv(), nextConfig, RemotePatterns, TRUSTED_IMAGE_HOSTS

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (6): AdminUser, adminUsers, AuditLog, auditLogs, PlatformSetting, platformSettings

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (7): code:bash (ffmpeg -i "$VIDEO" -vf "fps=4,scale=860:-1" -q:v 4 out/f_%03), Read these two warnings first, The closing form, which is ours, The five rules the film actually teaches, The frames, and what each one is for, Visual reference — the second film (layout grammar), What we deliberately did not take

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (6): config, proxy(), SUBDOMAIN_SURFACE, Surface, SURFACE_PREFIX, surfaceFor()

### Community 70 - "Community 70"
Cohesion: 0.29
Nodes (5): Always read graph nodes before editing, graphify - READ THIS FIRST then docs folder PHASES.md, Keeping the graph fresh, What you MUST do at the start of every session, What you MUST NOT do

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (6): code:bash (ffmpeg -ss 9.4 -i "$VIDEO" -frames:v 1 -vf "scale=1100:-1" -), Read these two warnings first, The frames, and what to take from each, Visual reference — the founder's reference film, What already exists, so it does not get rebuilt, What the forms should be about

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (6): config, middleware(), SUBDOMAIN_SURFACE, Surface, SURFACE_PREFIX, surfaceFor()

### Community 73 - "Community 73"
Cohesion: 0.4
Nodes (5): ActivityEntry, recentActivity(), unbalancedJournalCount(), AdminDashboard(), unbalancedJournalCount()

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (3): cjsRequire, loaded, MONTH_NAMES

### Community 75 - "Community 75"
Cohesion: 0.4
Nodes (3): isPastExpiry(), now, session

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (5): Brand assets, code:block1 (pnpm brand:build), Generated files, Palette, Requirements for the masters

### Community 79 - "Community 79"
Cohesion: 0.5
Nodes (4): auditActions(), AuditRow, listAuditEntries(), AuditLogPage()

### Community 80 - "Community 80"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 81 - "Community 81"
Cohesion: 0.4
Nodes (4): Before you end a session, Before you start a session, Softmato Platform — Documentation, The one-paragraph version

### Community 82 - "Community 82"
Cohesion: 0.5
Nodes (3): envPath, [, key, rawValue], match

### Community 83 - "Community 83"
Cohesion: 0.67
Nodes (3): logoDataUri(), OpengraphImage(), size

### Community 84 - "Community 84"
Cohesion: 0.5
Nodes (3): JWT, Session, User

### Community 85 - "Community 85"
Cohesion: 0.5
Nodes (3): envPath, [, key, rawValue], match

### Community 86 - "Community 86"
Cohesion: 0.5
Nodes (3): Changelog, code:markdown (## [Phase N] — YYYY-MM-DD), Entry template

## Knowledge Gaps
- **703 isolated node(s):** `eslintConfig`, `RemotePatterns`, `TRUSTED_IMAGE_HOSTS`, `nextConfig`, `config` (+698 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `submitContact()` connect `Community 1` to `Community 18`, `Community 11`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `headers` connect `Community 11` to `Community 1`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 17` to `Community 64`, `Community 65`, `Community 33`, `Community 1`, `Community 32`, `Community 0`, `Community 39`, `Community 43`, `Community 16`, `Community 49`, `Community 50`, `Community 18`, `Community 48`, `Community 21`, `Community 29`, `Community 62`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `RemotePatterns`, `TRUSTED_IMAGE_HOSTS` to the rest of the system?**
  _703 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._