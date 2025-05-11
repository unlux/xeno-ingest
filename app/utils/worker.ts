import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import "dotenv/config";

const prisma = new PrismaClient();

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined in the environment variables");
}

const redisConnection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // This is required for blocking operations
  }
);

// Customer worker for processing users
const customerWorker = new Worker(
  "customer",
  async (job: Job<any[]>) => {
    console.log("Worker: Starting customer worker...");
    const users = job.data;

    if (!Array.isArray(users) || users.length === 0) {
      console.warn("Received empty or invalid batch.");
      return;
    }

    console.log(`Worker: Processing batch of ${users.length} users...`);

    await prisma.$transaction(async (tx) => {
      // First create users without addresses
      const usersWithoutAddress = users.map(({ address, ...user }) => user);

      await tx.user.createMany({
        data: usersWithoutAddress,
        skipDuplicates: true,
      });

      // Then create addresses with references to their users
      const addresses = users
        .filter((user) => user.address)
        .map((user) => ({
          userId: user.id,
          ...user.address,
        }));

      if (addresses.length > 0) {
        await tx.address.createMany({
          data: addresses,
          skipDuplicates: true,
        });
      }
    });

    console.log(
      `Worker: Batch of ${users.length} users processed successfully.`
    );
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process one job at a time
  }
);

// Order worker for processing orders
const orderWorker = new Worker(
  "order",
  async (job: Job<any[]>) => {
    console.log("Order Worker: Starting order worker...");
    const orders = job.data;

    if (!Array.isArray(orders) || orders.length === 0) {
      console.warn("Received empty or invalid batch.");
      return;
    }

    console.log(`Worker: Processing batch of ${orders.length} orders...`);

    try {
      await prisma.$transaction(async (tx) => {
        // First, verify that all customer IDs exist in the database
        const customerIds = [
          ...new Set(orders.map((order) => order.customerId)),
        ];

        const existingCustomers = await tx.user.findMany({
          where: { id: { in: customerIds } },
          select: { id: true },
        });

        const existingCustomerIds = new Set(existingCustomers.map((c) => c.id));

        // Filter out orders with non-existent customer IDs
        const validOrders = orders.filter((order) =>
          existingCustomerIds.has(order.customerId)
        );

        if (validOrders.length < orders.length) {
          console.warn(
            `Skipping ${
              orders.length - validOrders.length
            } orders with non-existent customer IDs`
          );
        }

        if (validOrders.length === 0) {
          console.warn("No valid orders to process after filtering");
          return;
        }

        // Step 1: Strip out items to create orders
        const ordersWithoutItems = validOrders.map(
          ({ items, ...order }) => order
        );

        await tx.order.createMany({
          data: ordersWithoutItems,
          skipDuplicates: true,
        });

        // Step 2: Flatten items and attach orderId
        const allItems = validOrders
          .filter((order) => Array.isArray(order.items) && order.items.length)
          .flatMap((order) =>
            order.items.map((item) => ({
              ...item,
              orderId: order.id,
            }))
          );

        if (allItems.length > 0) {
          await tx.item.createMany({
            data: allItems,
            skipDuplicates: true,
          });
        }
      });

      console.log(
        `Worker: Batch of ${orders.length} orders processed successfully.`
      );
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error; // Re-throw to trigger the 'failed' event
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process one job at a time
  }
);

// Event handlers for customer worker
customerWorker.on("failed", (job, err) => {
  console.error(`Customer Worker: Job failed [id=${job.id}]`, err);
});

customerWorker.on("completed", (job) => {
  console.log(`Customer Worker: Job completed [id=${job.id}]`);
});

// Event handlers for order worker
orderWorker.on("failed", (job, err) => {
  console.error(`Order Worker: Job failed [id=${job.id}]`, err);
});

orderWorker.on("completed", (job) => {
  console.log(`Order Worker: Job completed [id=${job.id}]`);
});

// Keep the process running
process.on("SIGTERM", async () => {
  await customerWorker.close();
  await orderWorker.close();
});

console.log("Worker processes started with rate limit: 1 job every 5 seconds");
