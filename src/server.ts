import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.port, () => {
  // Keep startup log minimal for local development.
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${env.port}`);
});
