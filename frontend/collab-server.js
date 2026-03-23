
import { WebSocketServer } from 'ws';
import http from 'http';
import { setupWSConnection } from 'y-websocket/bin/utils';

const PORT = 1234;
const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Collab Server Running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
    setupWSConnection(conn, req, { docName: req.url.slice(1) });
});

server.listen(PORT, () => {
    console.log(`Collab server running on port ${PORT}`);
});
