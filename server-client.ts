// Server client will create outputs and append outputs

import { makeAdapter } from "@livestore/adapter-node";
import { makeCfSync } from "@livestore/sync-cf";

import { events, schema } from "./src/livestore/schema.ts";
import { createStorePromise, Store } from "@livestore/livestore";

const adapter = makeAdapter({
  storage: { type: "in-memory" },
  // or in-memory:
  // storage: { type: 'in-memory' },
  sync: { backend: makeCfSync({ url: "ws://localhost:8787" }) },
  // To enable devtools:
  // devtools: { schemaPath: new URL('./schema.ts', import.meta.url) },
});

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function tokenGeneration(store: Store<typeof schema>) {
  const outputId = crypto.randomUUID();

  store.commit(
    events.outputCreated({
      id: outputId,
      text: "Hello, world! This is a short message filled with random text.",
    }),
  );

  // await sleep(10);

  const outputId2 = crypto.randomUUID();

  store.commit(
    events.outputCreated({
      id: outputId2,
      text: "AI wrote this:",
    }),
  );
  // await sleep(20);

  // simulate LLM token generation
  let text2 = `
  A whisper grows in copper veins,
  Not loud, but firm—it makes its claims.
  “I hold your pace,” it calmly warns,
  “Too much, too fast, and I’ll deform.”

  Packets wait in silent queues,
  Dreams deferred by bounded views.
  Pressure builds, the stream resists—
  Order held with iron fists.

  Yield, then pulse—let flow resume.
  Control returns; no need for doom.
  Backpressure’s art is not delay,
  But balance taught the hard-wired way.`.trim();

  let currentPos = 0;
  while (currentPos < text2.length) {
    const chunkSize = Math.floor(Math.random() * 2) + 1;
    const chunk = text2.slice(currentPos, currentPos + chunkSize);

    const chunkId = crypto.randomUUID();

    // await sleep(6);
    store.commit(
      events.outputAppended({
        id: chunkId,
        outputId: outputId2,
        text: chunk,
      }),
    );

    currentPos += chunkSize;
  }

  await sleep(1000);
  store.shutdown();
}

async function main(storeId?: string) {
  if (!storeId) {
    storeId = `test-${crypto.randomUUID()}`;
  }
  console.log(`Connecting to storeId: ${storeId}`);

  const store = await createStorePromise({
    adapter,
    schema,
    storeId,
    syncPayload: { authToken: "insecure-token-change-me" },
    onBootStatus: (status) => {
      console.log(status);
    },
    boot: (store) => {
      store.manualRefresh();
      tokenGeneration(store);
    },
  });

  process.on("SIGINT", () => {
    console.log("Received SIGINT");
    if (store) {
      store.shutdown();
    }
  });
}

// @ts-ignore
const storeId = process.argv[2];
main(storeId)
  .then(() => {
    console.log("Done");
  })
  .catch((error) => {})
  .finally(() => {});
