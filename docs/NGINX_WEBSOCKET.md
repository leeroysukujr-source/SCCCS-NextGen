# Nginx WebSocket Proxy Notes

I inspected `frontend/nginx.conf`. The existing `/socket.io/` location includes the required upgrade headers, which is good:

```nginx
location /socket.io/ {
  proxy_pass http://backend:5000/socket.io/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

Recommendations to improve reliability and avoid WebSocket handshake issues:

1. Ensure `proxy_read_timeout` and `proxy_send_timeout` are large enough for long-lived connections:

```nginx
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
proxy_buffering off;
```

2. Add `proxy_set_header X-Forwarded-For` and other forwarding headers if not present:

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

3. If the application exposes Socket.IO on a different path (e.g., `/ws/`), add a matching `location` block.

4. If you use HTTP/2 between client and nginx, ensure nginx passes upgrades correctly — upgrades must be handled over HTTP/1.1, so if you terminate HTTP/2 at nginx, the proxy to backend should be HTTP/1.1.

5. If you use sticky sessions or multiple Socket.IO workers, configure a Redis adapter for Socket.IO and ensure the load balancer supports sticky connections (or use the Redis adapter so workers share state).

6. Example improved location block:

```nginx
location /socket.io/ {
  proxy_pass http://backend:5000/socket.io/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_read_timeout 3600s;
  proxy_send_timeout 3600s;
  proxy_buffering off;
}
```

7. Troubleshooting steps if issues persist:
- Check nginx error log for `Invalid frame header` or protocol errors.
- Check backend logs for exceptions during `GET /socket.io/?EIO=4&transport=websocket` (a 500 indicates server-side error during the upgrade).
- Test polling transport via: `curl "http://127.0.0.1:5000/socket.io/?EIO=4&transport=polling"` to validate base connectivity.
- Use a simple socket.io-client script locally to test connection and force `transports: ['websocket']`.

If you want, I can generate a patch to the `nginx.conf` file with the suggested improvements, or produce a troubleshooting checklist with exact log commands to run on the server.
