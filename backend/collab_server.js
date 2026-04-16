const WebSocket = require('ws');
const http = require('http');
const setupWSConnection = require('./y-websocket-utils.js').setupWSConnection;

const port = process.env.COLLAB_PORT || 1234;
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Yjs Collaboration Server\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

server.listen(port, () => {
  console.log(`Yjs collaboration server listening on port ${port}`);
});
