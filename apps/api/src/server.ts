import { createServer } from "node:http";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

const port = Number(process.env.PORT) || 8080;

const app = createApp();
const server = createServer(app);

server.listen(port, () => {
  logger.info({ port }, "misaki-api listening");
});
