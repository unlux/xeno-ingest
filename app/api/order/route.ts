import chunk from "lodash.chunk"; // or write your own
import { orderQueue } from "../../utils/queue";

export async function POST(request: Request) {
  try {
    const orders = await request.json();
    console.log(`Processing ${orders.length} orders...`);
    const batchSize = 100;
    const orderChunks = chunk(orders, batchSize);

    const jobs: { name: string; data: any }[] = orderChunks.map((chunk) => ({
      name: "persistent-batch",
      data: chunk,
    }));

    await orderQueue.addBulk(jobs);

    return Response.json({
      success: true,
      message: `Successfully queued ${orders.length} orders in ${orderChunks.length} batches`,
    });
  } catch (error) {
    console.error("Error processing orders:", error);
    return Response.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// // Process orders in a transaction to handle both orders and items
//     const result = await prisma.$transaction(async (tx) => {
//       // First create orders without items
//       const ordersWithoutItems = orders.map(({ items, ...order }) => order);
//       const createdOrders = await tx.order.createMany({
//         data: ordersWithoutItems,
//         skipDuplicates: true,
//       });

//       // Then create items
//       if (orders.some((order) => order.items?.length)) {
//         const allItems = orders
//           .filter((order) => order.items?.length)
//           .flatMap((order) =>
//             order.items.map((item) => ({
//               ...item,
//               orderId: order.id,
//             }))
//           );

//         await tx.item.createMany({
//           data: allItems,
//           skipDuplicates: true,
//         });
//       }

//       return createdOrders;
//     });
