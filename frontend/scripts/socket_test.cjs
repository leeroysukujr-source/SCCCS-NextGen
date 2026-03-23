const io = require('socket.io-client')

// Usage: node socket_test.cjs [url]
// Example: node socket_test.cjs http://localhost:5000

const url = process.argv[2] || process.env.SOCKET_TEST_URL || 'http://localhost:5000'
// Optional token: pass as third arg or via SOCKET_TEST_TOKEN env var
const token = process.argv[3] || process.env.SOCKET_TEST_TOKEN || null

console.log('Connecting to', url, token ? '(with token)' : '(no token)')

const socketOpts = { transports: ['websocket', 'polling'], reconnectionAttempts: 3, timeout: 5000 }
if (token) socketOpts.auth = { token }

const socket = io(url, socketOpts)

socket.on('connect', () => {
  console.log('Connected, id=', socket.id)
  try {
    const transport = socket.io && socket.io.engine && socket.io.engine.transport && socket.io.engine.transport.name
    console.log('Active transport:', transport || 'unknown')
  } catch (e) {
    console.log('Could not read transport name')
  }
  socket.disconnect()
  process.exit(0)
})

socket.on('connect_error', (err) => {
  console.error('connect_error:', err && (err.message || JSON.stringify(err)))
})

socket.on('reconnect_failed', () => {
  console.error('reconnect_failed')
  process.exit(2)
})

setTimeout(() => {
  console.error('Timed out trying to connect')
  process.exit(3)
}, 15000)
