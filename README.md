Okay, we'll skip the `DELETE` endpoint for campaigns. I'll proceed with creating the API documentation and updating the tracker to reflect the completion of OAuth and AI integration by your coworker.

**Tracker Update:**

```markdown
# Xeno SDE Internship Assignment Tracker

## Phase 1: Data Ingestion & Core Setup

- [x] **Initial Project Setup:** ...
- [x] **Data Generation Script (`new/generate-dataset.js`):** ...
- [x] **API Input Validation (Zod):**
  - [x] Customer Ingestion API (`/api/user`)
  - [x] Order Ingestion API (`/api/order`)
- [x] **Schema Definitions (`prisma/schema.prisma`):**
  - [x] Standardized all model IDs to `String @id @default(uuid()) @db.Uuid`.
  - [x] Define `User` model with `Address` relation.
  - [x] Define `Order` model with `Item` relation.
  - [x] Define `Segment` model.
  - [x] Define `Campaign` model.
    - [x] Simplified `CampaignStatus` to `PROCESSING`, `COMPLETED`.
    - [x] Removed `scheduledAt` field. Default status to `PROCESSING`.
  - [x] Define `CommunicationLog` model.
  - [x] Added Enums: `CampaignStatus`, `CommunicationStatus`.
  - [x] Added `communicationLogs CommunicationLog[]` to `User` model.
  - [x] Ran `npx prisma migrate dev` successfully.
  - [x] Ran `npx prisma generate` successfully.
- [x] **Data Ingestion API Endpoints:**
  - [x] `POST /api/user`: Ingest customer data.
  - [x] `POST /api/order`: Ingest order data.

## Phase 2: Campaign Management & Delivery

- [x] **Audience Segmentation & Preview:**
  - [x] API Endpoint: `POST /api/segments/preview`
    - [x] Define Zod schema for rule structure.
    - [x] Input: `rules` (JSON).
    - [x] Logic: Parse rules, fetch users, apply rules, count matches, collect sample IDs.
    - [x] Output: `{ "audienceSize": number, "sampleUserIds": string[] }`.
  - [x] API Endpoint: `POST /api/segments` (to create and save a segment)
    - [x] Define Zod schema for input (`name`, `rules`).
    - [x] Input: `name` (String), `rules` (JSON).
    - [x] Logic: Parse rules, calculate audience, store `Segment` in DB.
    - [x] Output: Saved segment object.
  - [x] API Endpoint: `GET /api/segments` (list all segments)
    - [x] Logic: Fetch all segments, order by `createdAt` desc.
    - [x] Output: Array of segment objects.
  - [x] API Endpoint: `GET /api/segments/:id` (get specific segment details)
    - [x] Logic: Fetch segment by ID.
    - [x] Output: Single segment object.
- [x] **Campaign Creation & Scheduling:**
  - [x] API Endpoint: `POST /api/campaigns` (Handles combined Segment & Campaign creation)
    - [x] Define Zod schema for input (`campaignName`, `message`, `segmentName`, `segmentRules`).
    - [x] Input: `campaignName`, `message`, `segmentName`, `segmentRules`.
    - [x] Logic: Create `Segment`, then `Campaign` with `status = PROCESSING`.
    - [x] Add a job to the BullMQ queue for processing. (Placeholder added, console log active)
    - [x] Output: Created segment and campaign objects.
  - [x] API Endpoint: `GET /api/campaigns` (list all campaigns)
    - [x] Logic: Fetch all campaigns, order by `createdAt` desc, include segment name.
    - [x] Output: Array of campaign objects with `segmentName`.
  - [x] API Endpoint: `GET /api/campaigns/:id` (get specific campaign details)
    - [x] Logic: Fetch campaign by ID, include detailed segment info.
    - [x] Output: Single campaign object with nested segment details.
  - [-] API Endpoint: `PUT /api/campaigns/:id` (REMOVED as per user request)
  - [-] API Endpoint: `DELETE /api/campaigns/:id` (SKIPPED as per user request)
- [x] **API Documentation:**
  - [x] Document request/response payloads for all core API endpoints. (Generated below)

## Phase 3: Communication Delivery & Logging

- [ ] **Background Worker Setup (BullMQ):**
  - [ ] Initialize BullMQ queue (`app/utils/queue.ts`).
  - [ ] Create a worker (`app/utils/worker.ts`) to process campaigns from the queue.
- [ ] **Campaign Processing Logic (in worker):**
  - [ ] Fetch campaign details (including segment audience).
  - [ ] For each user in the audience:
    - [ ] Personalize message (e.g., replace `{{name}}`).
    - [ ] Create `CommunicationLog` with `status = PENDING`.
    - [ ] Simulate sending message (e.g., log to console, or integrate with a mock/real provider).
    - [ ] Update `CommunicationLog` status (`SENT` or `FAILED`).
    - [ ] Increment `sentCount` or `failedCount` on `Campaign`.
  - [ ] Update `Campaign` status to `COMPLETED` once all users are processed.
- [ ] **Communication Log API Endpoints:**
  - [ ] `GET /api/campaigns/:campaignId/logs`: List logs for a campaign.
  - [ ] `GET /api/users/:userId/logs`: List logs for a user.

## Phase 4: Advanced Features & Refinements

- [x] **OAuth Integration (Frontend/Backend)** (Completed by coworker)
- [x] **AI-Powered Message Personalization (Optional)** (Completed by coworker)
- [ ] **Error Handling & Monitoring:** ...
- [ ] **Testing (Unit, Integration):** ...
- [ ] **Deployment:** ...
```

Here is the API documentation:

---

# Xeno Marketing Platform API Documentation

This document provides details for all available API endpoints.

**Base URL**: `http://localhost:3000/api` (during development)

## Authentication

(Authentication details, such as OAuth token requirements, would typically be here. Assuming handled by coworker's OAuth integration.)

## Common Responses

- **400 Bad Request**: The request was malformed, or input validation failed. The response body will usually contain a `success: false` flag and an `error` message, potentially with a `details` object for validation errors.
- **404 Not Found**: The requested resource (e.g., a specific segment or campaign) could not be found.
- **500 Internal Server Error**: An unexpected error occurred on the server.

---

## 1. User Management

### 1.1. Ingest Customer Data

- **Endpoint**: `POST /user`
- **Description**: Creates or updates customer data in the system.
- **Request Body**: `application/json`
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "123-456-7890",
    "address": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zipCode": "90210",
      "country": "USA"
    }
  }
  ```
  - `name` (string, required): Full name of the customer.
  - `email` (string, required, unique): Email address of the customer.
  - `phone` (string, required): Phone number of the customer.
  - `address` (object, required): Customer's address details.
    - `street`, `city`, `state`, `zipCode`, `country` (all strings, required).
- **Successful Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User data ingested successfully.",
    "data": {
      "id": "generated-uuid",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "123-456-7890",
      "createdAt": "iso-timestamp",
      "address": {
        "userId": "generated-uuid",
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zipCode": "90210",
        "country": "USA"
      }
    }
  }
  ```
- **Error Response (400 Bad Request - Validation Error)**:
  ```json
  {
    "success": false,
    "error": "Invalid user data provided.",
    "details": {
      "email": ["Invalid email format"]
    }
  }
  ```

---

## 2. Order Management

### 2.1. Ingest Order Data

- **Endpoint**: `POST /order`
- **Description**: Ingests order data for a customer. Assumes the customer (`customerId`) already exists.
- **Request Body**: `application/json`
  ```json
  {
    "customerId": "customer-uuid",
    "items": [
      {
        "productId": "prod-123",
        "name": "Awesome T-Shirt",
        "price": 2500, // In cents
        "quantity": 2,
        "total": 5000 // In cents
      }
    ],
    "totalAmount": 5000, // In cents
    "currency": "USD",
    "status": "delivered"
  }
  ```
  - `customerId` (string, UUID, required): The ID of the customer placing the order.
  - `items` (array of objects, required): List of items in the order.
    - `productId` (string, required): Identifier for the product.
    - `name` (string, required): Name of the product.
    - `price` (integer, required): Price of one unit of the product (in cents).
    - `quantity` (integer, required): Quantity of the product.
    - `total` (integer, required): Total price for this item line (price \* quantity, in cents).
  - `totalAmount` (integer, required): Total amount for the entire order (in cents).
  - `currency` (string, required): Currency code (e.g., "USD").
  - `status` (string, required): Status of the order (e.g., "processing", "shipped", "delivered").
- **Successful Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Order data ingested successfully.",
    "data": {
      "id": "generated-order-uuid",
      "customerId": "customer-uuid",
      "totalAmount": 5000,
      "currency": "USD",
      "status": "delivered",
      "createdAt": "iso-timestamp",
      "items": [
        {
          "id": "generated-item-uuid",
          "orderId": "generated-order-uuid",
          "productId": "prod-123",
          "name": "Awesome T-Shirt",
          "price": 2500,
          "quantity": 2,
          "total": 5000
        }
      ]
    }
  }
  ```
- **Error Response (404 Not Found - Customer not found)**:
  ```json
  {
    "success": false,
    "error": "Customer with ID customer-uuid not found."
  }
  ```

---

## 3. Segment Management

### 3.1. Preview Segment Audience

- **Endpoint**: `POST /segments/preview`
- **Description**: Calculates the potential audience size for a given set of segment rules without saving the segment.
- **Request Body**: `application/json`
  ```json
  {
    "rules": {
      "groups": [
        {
          "conditions": [
            {
              "field": "totalSpend",
              "operator": "greaterThan",
              "value": 10000
            },
            { "field": "state", "operator": "equals", "value": "CA" }
          ]
        },
        {
          "conditions": [
            {
              "field": "orderCount",
              "operator": "greaterThanOrEqual",
              "value": 5
            }
          ]
        }
      ]
    }
  }
  ```
  - `rules` (object, required): The segmentation rules. See `segment-rules-schema.ts` for detailed structure.
    - `groups` (array of objects, required): Represents OR conditions between groups.
      - `conditions` (array of objects, required): Represents AND conditions within a group.
        - `field` (string, required): Field to evaluate (e.g., `totalSpend`, `orderCount`, `lastOrderDate`, `state`, `userCreatedAt`).
        - `operator` (string, required): Operator (e.g., `greaterThan`, `equals`, `newerThanDays`, `olderThanDays`).
        - `value` (any, required): Value to compare against.
- **Successful Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "audienceSize": 150,
      "sampleUserIds": ["user-uuid-1", "user-uuid-2", "..."] // Up to 20 sample IDs
    }
  }
  ```

### 3.2. Create Segment

- **Endpoint**: `POST /segments`
- **Description**: Creates and saves a new segment based on the provided rules.
- **Request Body**: `application/json`
  ```json
  {
    "name": "High Value CA Customers",
    "rules": {
      "groups": [
        {
          "conditions": [
            {
              "field": "totalSpend",
              "operator": "greaterThan",
              "value": 10000
            },
            { "field": "state", "operator": "equals", "value": "CA" }
          ]
        }
      ]
    }
  }
  ```
  - `name` (string, required): Name for the segment.
  - `rules` (object, required): Segmentation rules (same structure as preview).
- **Successful Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Segment \"High Value CA Customers\" created successfully.",
    "data": {
      "id": "generated-segment-uuid",
      "name": "High Value CA Customers",
      "rules": {
        /* rules object */
      },
      "audienceUserIds": ["user-uuid-1", "..."],
      "createdAt": "iso-timestamp",
      "updatedAt": "iso-timestamp"
    }
  }
  ```

### 3.3. List All Segments

- **Endpoint**: `GET /segments`
- **Description**: Retrieves a list of all saved segments, ordered by creation date (newest first).
- **Successful Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "segment-uuid-1",
        "name": "High Value CA Customers",
        "rules": {
          /* rules object */
        },
        "audienceUserIds": ["..."],
        "createdAt": "iso-timestamp",
        "updatedAt": "iso-timestamp"
      },
      {
        "id": "segment-uuid-2",
        "name": "Recent Shoppers"
        // ... other fields
      }
    ]
  }
  ```

### 3.4. Get Specific Segment

- **Endpoint**: `GET /segments/:segmentId`
- **Description**: Retrieves details for a specific segment by its ID.
- **Path Parameters**:
  - `segmentId` (string, UUID, required): The ID of the segment to retrieve.
- **Successful Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "segment-uuid-1",
      "name": "High Value CA Customers",
      "rules": {
        /* rules object */
      },
      "audienceUserIds": ["..."],
      "createdAt": "iso-timestamp",
      "updatedAt": "iso-timestamp"
    }
  }
  ```

---

## 4. Campaign Management

### 4.1. Create Campaign (and associated Segment)

- **Endpoint**: `POST /campaigns`
- **Description**: Creates a new segment and a new campaign associated with it in a single operation. The campaign will immediately be in `PROCESSING` status.
- **Request Body**: `application/json`
  ```json
  {
    "campaignName": "Welcome New Users Q2",
    "message": "Hello {{name}}, welcome to our platform! Enjoy 10% off your first order.",
    "segmentName": "New Users - Last 14 Days",
    "segmentRules": {
      "groups": [
        {
          "conditions": [
            {
              "field": "userCreatedAt",
              "operator": "newerThanDays",
              "value": 14
            }
          ]
        }
      ]
    }
  }
  ```
  - `campaignName` (string, required, min 3 chars): Name for the campaign.
  - `message` (string, required, min 10 chars): Message template for the campaign. Use `{{name}}` for personalization.
  - `segmentName` (string, required, min 3 chars): Name for the new segment to be created.
  - `segmentRules` (object, required): Segmentation rules for the new segment (same structure as `/segments/preview`).
- **Successful Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Segment \"New Users - Last 14 Days\" and Campaign \"Welcome New Users Q2\" created successfully. Campaign status: PROCESSING.",
    "data": {
      "segment": {
        "id": "generated-segment-uuid",
        "name": "New Users - Last 14 Days",
        "rules": {
          /* rules object */
        },
        "audienceUserIds": ["..."],
        "createdAt": "iso-timestamp",
        "updatedAt": "iso-timestamp"
      },
      "campaign": {
        "id": "generated-campaign-uuid",
        "name": "Welcome New Users Q2",
        "messageTemplate": "Hello {{name}}, welcome to our platform! Enjoy 10% off your first order.",
        "status": "PROCESSING",
        "audienceSize": 120, // Example
        "sentCount": 0,
        "failedCount": 0,
        "createdAt": "iso-timestamp",
        "updatedAt": "iso-timestamp",
        "segmentId": "generated-segment-uuid"
      }
    }
  }
  ```

### 4.2. List All Campaigns

- **Endpoint**: `GET /campaigns`
- **Description**: Retrieves a list of all campaigns, ordered by creation date (newest first). Includes the name of the associated segment.
- **Successful Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "campaign-uuid-1",
        "name": "Welcome New Users Q2",
        "messageTemplate": "Hello {{name}}, ...",
        "status": "PROCESSING",
        "audienceSize": 120,
        "sentCount": 0,
        "failedCount": 0,
        "createdAt": "iso-timestamp",
        "updatedAt": "iso-timestamp",
        "segmentId": "segment-uuid-associated",
        "segmentName": "New Users - Last 14 Days", // Flattened for convenience
        "segment": {
          // Original nested segment object
          "name": "New Users - Last 14 Days"
        }
      }
      // ... other campaigns
    ]
  }
  ```

### 4.3. Get Specific Campaign

- **Endpoint**: `GET /campaigns/:campaignId`
- **Description**: Retrieves details for a specific campaign by its ID, including full details of its associated segment.
- **Path Parameters**:
  - `campaignId` (string, UUID, required): The ID of the campaign to retrieve.
- **Successful Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "campaign-uuid-1",
      "name": "Welcome New Users Q2",
      "messageTemplate": "Hello {{name}}, ...",
      "status": "PROCESSING",
      "audienceSize": 120,
      "sentCount": 0,
      "failedCount": 0,
      "createdAt": "iso-timestamp",
      "updatedAt": "iso-timestamp",
      "segmentId": "segment-uuid-associated",
      "segment": {
        // Full segment details
        "id": "segment-uuid-associated",
        "name": "New Users - Last 14 Days",
        "rules": {
          /* rules object */
        },
        "audienceUserIds": ["..."]
      }
    }
  }
  ```

---

This documentation should cover all the API endpoints we've built so far. Let me know if you need any adjustments or further details!
