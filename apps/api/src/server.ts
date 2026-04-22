import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { attachCallStreamHandler } from "./ws/call-stream.handler.js";
import { handleTestCall } from "./ws/test-call.handler.js";
import { logger } from "./lib/logger.js";

const port = Number(process.env.PORT) || 8080;

const app = createApp();
const server = createServer(app);

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const path = request.url?.split("?")[0] ?? "";
  if (path === "/call-stream") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      attachCallStreamHandler(ws, request);
    });
  } else if (path === "/test-call") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      handleTestCall(ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, () => {
  logger.info({ port }, "logivoice-api listening");
});
