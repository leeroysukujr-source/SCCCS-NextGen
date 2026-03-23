# Socket.IO Connection Fixes

## Issues Fixed

### 1. Improved Connection Handler
- Enhanced token retrieval from multiple sources (auth dict, query params, headers)
- Better error handling and logging
- Reduced log spam from rejected connections
- Support for both Socket.IO v4 and v5

### 2. Error Handling
- Replaced all `print()` statements with proper logging
- Better exception handling in all Socket.IO event handlers
- Graceful degradation on connection failures

## Connection Configuration

### Flask-SocketIO (Backend)
- **Port**: 5000 (configurable via `SERVER_PORT` env var)
- **URL**: `http://localhost:5000`
- **Requires**: JWT token in `auth.token` or Authorization header

### Mediasoup Server (Separate)
- **Port**: 4000 (configurable via `MEDIASOUP_PORT` env var)
- **URL**: `http://localhost:4000`
- **Does NOT require**: JWT token (different Socket.IO instance)

## Frontend Configuration

The frontend correctly uses:
- `getSocketUrl()` → returns `http://localhost:5000` for Flask-SocketIO
- `getMediasoupUrl()` → returns `http://localhost:4000` for Mediasoup

## Common Issues

### 400 Bad Request Errors on Port 4000
- **Cause**: Mediasoup server may not be running
- **Solution**: Ensure Mediasoup server is started separately
- **Note**: Mediasoup errors don't affect Flask-SocketIO functionality

### Connection Rejection Errors
- **Cause**: Missing or invalid JWT token
- **Solution**: Ensure token is sent in `auth.token` when connecting

## Testing

1. **Test Flask-SocketIO connection**:
   ```javascript
   const socket = io('http://localhost:5000', {
     auth: { token: 'your-jwt-token' }
   })
   ```

2. **Verify connection**:
   - Socket should emit `connected` event with `user_id`
   - Check backend logs for connection acceptance

## Next Steps

If you continue to see errors:
1. Ensure Mediasoup server is running (port 4000)
2. Verify Flask-SocketIO server is running (port 5000)
3. Check that JWT tokens are valid and being sent correctly
4. Review backend logs for specific error messages

