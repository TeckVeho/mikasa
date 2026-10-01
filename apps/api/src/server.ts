import { createServer } from "node:http";
import { loadAppSecretsFile } from "./lib/load-app-secrets-file.js";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

loadAppSecretsFile();

const port = Number(process.env.PORT) || 8080;

const app = createApp();
const server = createServer(app);

server.listen(port, () => {
  logger.info({ port }, "misaki-api listening");
});
