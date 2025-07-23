// Server client will create outputs and append outputs

import { makeAdapter } from "@livestore/adapter-node";
import { makeCfSync } from "@livestore/sync-cf";

import { events, schema } from "./src/livestore/schema.ts";
import { createStorePromise } from "@livestore/livestore";

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

let store;

async function main(storeId?: string) {
  if (!storeId) {
    storeId = `test-${crypto.randomUUID()}`;
  }
  console.log(storeId);
  // const storeId = "test-19a3812a-952a-4c8d-9cc8-a7506ae6b3f2";

  store = await createStorePromise({
    adapter,
    schema,
    storeId,
    syncPayload: { authToken: "insecure-token-change-me" },
  });

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
      text: "Output 2",
    }),
  );
  await sleep(0);

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
  But balance taught the hard-wired way.`;

  for (let i = 0; i < text2.length; i += Math.floor(Math.random() * 2) + 1) {
    await sleep(0);
    store.commit(
      events.outputAppended({
        id: outputId2,
        text: text2.slice(i, i + Math.min(2, text2.length - i)),
      }),
    );
  }

  for (let i = 0; i < text2.length; i += Math.floor(Math.random() * 2) + 1) {
    await sleep(0);
    store.commit(
      events.outputAppended({
        id: outputId2,
        text: text2.slice(i, i + Math.min(2, text2.length - i)),
      }),
    );
  }

  await sleep(10);
}

// @ts-ignore
const storeId = process.argv[2];
main(storeId)
  .then(() => {
    console.log("Done");
  })
  .catch((error) => {
    console.error(error);
  })
  .finally(() => {
    // if store defined, shutdown
    if (store) {
      store.shutdown();
    }
  });
