import chunk from "lodash.chunk";
import { customerQueue } from "../../utils/queue";

export async function POST(request: Request) {
  try {
    const users = await request.json();
    console.log(`Processing ${users.length} users...`);
    const batchSize = 100;
    const userChunks = chunk(users, batchSize);

    // 🔥 Use addBulk to queue all jobs at once
    const jobs: { name: string; data: any }[] = userChunks.map((chunk) => ({
      name: "persistent-batch",
      data: chunk,
    }));

    await customerQueue.addBulk(jobs);

    return Response.json({
      success: true,
      message: `Successfully queued ${users.length} users in ${userChunks.length} batches`,
    });
  } catch (error) {
    console.error("Error processing users:", error);
    return Response.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
