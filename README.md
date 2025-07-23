# Text Append Issue

With a materializer like this

```typescript
  "v1.OutputCreated": ({ id, text }) => tables.outputs.insert({ id, text }),
  "v1.OutputAppended": ({ id, text }, ctx) => {
    const ops = [];

    const existingOutput = ctx.query(
      tables.outputs.select().where({ id }).limit(1),
    )[0];

    if (!existingOutput) {
      console.log("Output not found");
      return [];
    }

    const newContent = text;
    const concatenatedData = (existingOutput.text || "") + newContent;

    return [tables.outputs.update({ text: concatenatedData }).where({ id })];
  },
```

LiveStore exhibits weird behavior.


## Running locally

```bash
export VITE_LIVESTORE_SYNC_URL='http://localhost:8787'
pnpm i
```

Once you have a store ID from the TODO MVC, open up a terminal and run:

```
tsx server-client.ts {your store ID}
```

That will rapidly add text as if an LLM (or a plain computer) types in little batches of tokens at a time.

## One liner

```
export STORE_ID=$(head -c 10 /dev/urandom | xxd -p); open "http://localhost:60001/?storeId=$STORE_ID" && echo "Waiting for ui to load" && sleep 5 && echo "Away we go" && tsx server-client.ts $STORE_ID
```

## What happens


Several things will likely occur. One of which is the materializer hash mismatch detection should show up in the tab you ran it from.

```
LiveStore.UnexpectedError: { "cause": "Materializer hash mismatch detected for event \"v1.OutputAppended\".", "note": "Please make sure your event materializer is a pure function without side effects.", "payload": undefined }
```

The second is that you _cannot_ run `tsx server-client.ts {your store ID}` again. It will spew a lot of
Livestore shutdowns and then finally exit:

```
[06:46:01.362 window] DEBUG (#175): LiveStore shutdown complete
  thread: window
  debugInstanceId: iU3cJ2rFuG
  storeId: 6db32028-c6b2-4d1f-90fa-dc0851a5d59a
[06:46:01.362 window] DEBUG (#181): LiveStore shutdown complete
  thread: window
  debugInstanceId: iU3cJ2rFuG
  storeId: 6db32028-c6b2-4d1f-90fa-dc0851a5d59a
[06:46:01.362 window] DEBUG (#187): LiveStore shutdown complete
  thread: window
  debugInstanceId: iU3cJ2rFuG
  storeId: 6db32028-c6b2-4d1f-90fa-dc0851a5d59a
[06:46:01.362 window] DEBUG (#193): LiveStore shutdown complete
  thread: window
  debugInstanceId: iU3cJ2rFuG
  storeId: 6db32028-c6b2-4d1f-90fa-dc0851a5d59a
```
