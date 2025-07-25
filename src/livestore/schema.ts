import {
  Events,
  makeSchema,
  Schema,
  SessionIdSymbol,
  State,
} from "@livestore/livestore";

// You can model your state as SQLite tables (https://docs.livestore.dev/reference/state/sqlite-schema)
export const tables = {
  todos: State.SQLite.table({
    name: "todos",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      text: State.SQLite.text({ default: "" }),
      completed: State.SQLite.boolean({ default: false }),
      deletedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
    },
  }),
  outputs: State.SQLite.table({
    name: "outputs",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      text: State.SQLite.text({ default: "" }),
    },
  }),
  // Client documents can be used for local-only state (e.g. form inputs)
  uiState: State.SQLite.clientDocument({
    name: "uiState",
    schema: Schema.Struct({
      newTodoText: Schema.String,
      filter: Schema.Literal("all", "active", "completed"),
    }),
    default: { id: SessionIdSymbol, value: { newTodoText: "", filter: "all" } },
  }),
};

// Events describe data changes (https://docs.livestore.dev/reference/events)
export const events = {
  outputCreated: Events.synced({
    name: "v1.OutputCreated",
    schema: Schema.Struct({ id: Schema.String, text: Schema.String }),
  }),
  outputAppended: Events.synced({
    name: "v1.OutputAppended",
    schema: Schema.Struct({ id: Schema.String, text: Schema.String }),
  }),
  todoCreated: Events.synced({
    name: "v1.TodoCreated",
    schema: Schema.Struct({ id: Schema.String, text: Schema.String }),
  }),
  todoCompleted: Events.synced({
    name: "v1.TodoCompleted",
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoUncompleted: Events.synced({
    name: "v1.TodoUncompleted",
    schema: Schema.Struct({ id: Schema.String }),
  }),
  todoDeleted: Events.synced({
    name: "v1.TodoDeleted",
    schema: Schema.Struct({ id: Schema.String, deletedAt: Schema.Date }),
  }),
  todoClearedCompleted: Events.synced({
    name: "v1.TodoClearedCompleted",
    schema: Schema.Struct({ deletedAt: Schema.Date }),
  }),
  uiStateSet: tables.uiState.set,
};

// Materializers are used to map events to state (https://docs.livestore.dev/reference/state/materializers)
const materializers = State.SQLite.materializers(events, {
  "v1.TodoCreated": ({ id, text }) =>
    tables.todos.insert({ id, text, completed: false }),
  "v1.TodoCompleted": ({ id }) =>
    tables.todos.update({ completed: true }).where({ id }),
  "v1.TodoUncompleted": ({ id }) =>
    tables.todos.update({ completed: false }).where({ id }),
  "v1.TodoDeleted": ({ id, deletedAt }) =>
    tables.todos.update({ deletedAt }).where({ id }),
  "v1.TodoClearedCompleted": ({ deletedAt }) =>
    tables.todos.update({ deletedAt }).where({ completed: true }),
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
});

const state = State.SQLite.makeState({ tables, materializers });

export const schema = makeSchema({ events, state });
