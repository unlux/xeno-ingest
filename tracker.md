# Xeno SDE Internship Assignment Tracker

## Phase 1: Data Ingestion & Core Setup

- [x] **OAuth with Google:** (Assumed complete for backend, frontend handles login flow)
- [x] **Dataset:** (Sample data generation script `generate-dataset.js` created and used for testing)
- [x] **Database Setup (Prisma):**
  - [x] Initialized Prisma schema (`prisma/schema.prisma`)
  - [x] Defined `User` model (using UUIDs)
  - [x] Defined `Order` model (using UUIDs)
- [x] **Data Ingestion APIs (Pub-Sub Architecture):**
  - [x] Customer Ingestion API (`POST /api/user`):
    - [x] Accepts array of customer data.
    - [x] Adds jobs to `customerQueue`.
  - [x] Order Ingestion API (`POST /api/order`):
    - [x] Accepts array of order data.
    - [x] Adds jobs to `orderQueue`.
- [x] **Message Queue (Redis & BullMQ):**
  - [x] Configured BullMQ for `customerQueue`.
  - [x] Configured BullMQ for `orderQueue`.
- [x] **Asynchronous Workers:**
  - [x] Created worker for `customerQueue` (processes `persistent-batch` jobs).
    - [x] Persists customer data to DB.
  - [x] Created worker for `orderQueue` (processes `persistent-order-batch` jobs).
    - [x] Persists order data to DB.
- [x] **Initial Testing:**
  - [x] Tested customer ingestion flow.
  - [x] Tested order ingestion flow.

## Phase 2: Campaign Management & Delivery

- [x] **API Input Validation (Zod):**
  - [x] Customer Ingestion API (`/api/user`):
    - [x] Defined comprehensive `userSchema` (including nested `addressSchema`) matching Prisma model.
    - [x] Implemented `usersSchema.safeParse()` for request body.
    - [x] Return 400 on validation failure with detailed field errors.
  - [x] Order Ingestion API (`/api/order`):
    - [x] Defined comprehensive `orderSchema` (including nested `itemSchema`) matching Prisma model.
    - [x] Implemented `ordersSchema.safeParse()` for request body.
    - [x] Return 400 on validation failure with detailed field errors.
- [x] **Schema Definitions (`prisma/schema.prisma`):**
  - [x] Standardized all model IDs to `String @id @default(uuid()) @db.Uuid`.
  - [x] Define `Segment` model:
    - [x] Fields: `id` (UUID, PK), `name` (String), `rules` (JSON), `audienceUserIds` (String[] of UUIDs), `createdAt`, `updatedAt`.
    - [x] Relation: `Campaigns[]`.
    - [x] Added `@@index([name])`.
  - [x] Define `Campaign` model:
    - [x] Fields: `id` (UUID, PK), `name` (String), `messageTemplate` (String), `segmentId` (UUID, FK to Segment), `status` (Enum), `audienceSize`, `sentCount`, `failedCount`, `createdAt`, `updatedAt`.
    - [x] Relation: `Segment`, `CommunicationLog[]`.
    - [x] Added `@@index([segmentId])`, `@@index([status])`.
  - [x] Define `CommunicationLog` model:
    - [x] Fields: `id` (UUID, PK), `campaignId` (UUID, FK to Campaign), `customerId` (UUID, FK to User), `status` (Enum), `personalizedMessage`, `sentAt`, `vendorMessageId`, `deliveryReceiptStatus`, `createdAt`, `updatedAt`.
    - [x] Relation: `Campaign`, `User`.
    - [x] Added `@@index([campaignId])`, `@@index([customerId])`, `@@index([status])`.
  - [x] Added Enums: `CampaignStatus`, `CommunicationStatus`.
  - [x] Added `communicationLogs CommunicationLog[]` to `User` model.
  - [x] Ran `npx prisma migrate dev` successfully.
  - [x] Ran `npx prisma generate` successfully.
- [ ] **Audience Segmentation & Preview:**
  - [x] API Endpoint: `POST /api/segments/preview`
    - [x] Define Zod schema for rule structure (`segmentRulesSchema`, `conditionGroupSchema`, `conditionSchema`).
    - [x] Input: `rules` (JSON object representing segment logic).
    - [x] Validation: Zod schema for rules structure.
    - [x] Logic: (Implementation Complete - Needs Testing & Potential Optimization)
      - [x] Parse `rules`.
      - [x] Fetch Users with Orders and Address (using Prisma-generated types).
      - [x] Implement helper `calculateUserAggregates(user)` for `totalSpend`, `orderCount`, `lastOrderDate`.
      - [x] Implement helper `evaluateCondition(user, aggregates, condition)` for individual rule conditions.
      - [x] Implement helper `evaluateUserAgainstRuleGroups(user, aggregates, rules)` for OR/AND logic.
      - [x] Iterate through users, apply rules, count matches, collect sample IDs.
    - [x] Output: `{ "audienceSize": number, "sampleUserIds": ["id1", "id2", ...] }`.
  - [ ] API Endpoint: `POST /api/segments` (to create and save a segment for a campaign)
    - [ ] Define Zod schema for input (`name`, `rules`).
    - Input: `name` (String), `rules` (JSON).
    - Validation: Zod schema for input.
    - Logic:
      - Parse `rules`.
      - Reuse segmentation logic from preview (`calculateUserAggregates`, `evaluateCondition`, `evaluateUserAgainstRuleGroups`) to get `audienceUserIds` and `audienceSize`.
      - Store `Segment` in DB with `name`, `rules` (as JSON), and `audienceUserIds` (array of strings).
    - Output: Saved segment object.
  - [ ] API Endpoint: `GET /api/segments` (list all segments)
    - Output: Array of segment objects.
  - [ ] API Endpoint: `GET /api/segments/:id` (get specific segment details)
    - Output: Single segment object.
- [ ] **Campaign Creation & Delivery Logic:**
  - [ ] API Endpoint: `POST /api/campaigns`
    - Input: `name` (String), `messageTemplate` (String, e.g., "Hi {name}, ..."), `segmentId` (String UUID).
    - Validation: Zod schema for input.
    - Logic:
      1.  Fetch `Segment` by `segmentId` (including `audienceUserIds`).
      2.  Create `Campaign` record in DB (status: DRAFT or PROCESSING, `audienceSize` from segment).
      3.  For each `customerId` in `segment.audienceUserIds`:
          - Fetch customer details (e.g., name) for personalization.
          - Construct `personalizedMessage`.
          - Create `CommunicationLog` entry (status: PENDING, `campaignId`, `customerId`, `personalizedMessage`).
          - Add a job to `deliveryQueue` with `{ communicationLogId: string, customerId: string, personalizedMessage: string }`.
      4.  Update Campaign status (e.g., to SENDING).
    - Output: Created campaign object.
  - [ ] **Message Queue for Delivery (`deliveryQueue`):**
    - [ ] Configure BullMQ for `deliveryQueue`.
  - [ ] **Worker for `deliveryQueue`:**
    - [ ] Process jobs from `deliveryQueue`.
    - [ ] For each job:
      - Call Dummy Vendor Email API (`/api/mock-vendor/send-email`) with `communicationLogId`, `customerId`, `personalizedMessage`.
  - [ ] **Dummy Vendor Email API (Mock):**
    - [ ] Create API endpoint: `POST /api/mock-vendor/send-email`
      - Input: `{ communicationLogId: string, customerId: string, message: string }`.
      - Logic:
        - Simulate delay (e.g., 50-200ms).
        - Simulate success/failure (90% SENT, 10% FAILED).
        - Generate a `vendorMessageId`.
      - Action: Asynchronously call own Delivery Receipt API (`/api/delivery-receipt`) with `communicationLogId`, `vendorMessageId`, simulated `status`, `timestamp`.
    - Output: `{ "status": "QUEUED_BY_VENDOR", "vendorMessageId": "some-uuid" }`.
  - [ ] **Delivery Receipt API:**
    - [ ] API Endpoint: `POST /api/delivery-receipt`
      - Input: `{ communicationLogId: string, vendorMessageId: string, status: "SENT" | "FAILED", timestamp: string }`.
      - Validation: Zod schema for input.
      - Logic:
        1.  Find `CommunicationLog` by `communicationLogId`.
        2.  Update its `status`, `vendorMessageId`, `deliveryReceiptStatus`, `sentAt`.
        3.  Increment `sentCount` or `failedCount` on the parent `Campaign` record.
        4.  (Brownie Points: If high volume, add to a `receiptProcessingQueue` and update DB in batches via a worker).
      - Output: `{ "success": true }`.
- [ ] **Campaign History/Stats:**
  - [ ] API Endpoint: `GET /api/campaigns` (or `/api/campaigns/history`)
    - Logic: Fetch campaigns, include `segment` name, `audienceSize`, `sentCount`, `failedCount`. Sort by `createdAt` descending.
    - Output: List of campaign objects with stats.
  - [ ] API Endpoint: `GET /api/campaigns/:id`
    - Logic: Fetch specific campaign, include its `CommunicationLog` entries (or a summary).
    - Output: Detailed campaign object.

## Phase 3: Authentication & AI Integration

- [ ] **Authentication (Google OAuth 2.0 with NextAuth.js or similar):**
  - [ ] Setup NextAuth.js.
  - [ ] Implement Google Provider.
  - [ ] Protect relevant API routes (e.g., segment creation, campaign creation, viewing history) - only logged-in users.
  - [ ] Store user session.
- [ ] **AI Integration (Choose at least one):**
  - [ ] **Option 1: Natural Language to Segment Rules**
    - [ ] UI for text input.
    - [ ] Backend API to take text, call LLM (e.g., OpenAI, Vertex AI).
    - [ ] LLM prompt engineering to convert text to structured rule JSON.
    - [ ] Present suggested rules to user for confirmation.
  - [ ] **Option 2: AI-Driven Message Suggestions**
    - [ ] UI element in campaign creation.
    - [ ] Backend API takes campaign objective/audience summary.
    - [ ] Call LLM to generate 2-3 message variants.
  - [ ] **Option 3: Campaign Performance Summarization**
    - [ ] On campaign details page/dashboard.
    - [ ] Backend logic gathers stats.
    - [ ] Call LLM with stats to generate human-readable summary.
  - [ ] Document AI tool used, API keys (use .env), and rationale.

## Phase 4: Dashboard & Finalization

- [ ] **Dashboard APIs:**
  - [ ] API Endpoint: `GET /api/dashboard/stats`
    - Logic:
      - `totalCustomers`: Count from `User` table.
      - `activeCampaigns`: Count from `Campaign` table (status = SENDING or PROCESSING).
      - `overallDeliveryRate`: Calculate from all `CommunicationLog`s or sum of `Campaign` stats.
      - `customerSegmentsCount`: Count from `Segment` table.
    - Output: `{ totalCustomers: number, activeCampaigns: number, deliveryRate: number, customerSegments: number }`.
- [ ] **Deployment (Vercel/Render/Railway):**
  - [ ] Configure environment variables.
  - [ ] Deploy application.
  - [ ] Test deployed version.
- [ ] **Demo Video (max 7 mins):**
  - [ ] Plan script: Features, problem approach, trade-offs, AI.
  - [ ] Record and edit.
- [ ] **README.md Updates:**
  - [ ] Final local setup instructions.
  - [ ] Architecture diagram (update with final components).
  - [ ] Summary of AI tools and tech used.
  - [ ] Known limitations or assumptions.
