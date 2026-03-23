# Frontend Setup & Running Instructions

## Quick Start

1. **Install Dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Access the Application**:
   - Local: http://localhost:5173
   - Network: http://[YOUR_IP]:5173

## Configuration

The frontend automatically detects the backend URL:
- If accessing via `localhost:5173` → Uses `http://localhost:5000/api`
- If accessing via network IP → Uses `http://192.168.1.65:5000/api`

To override, set `VITE_API_URL` in `.env` file:
```
VITE_API_URL=http://localhost:5000/api
```

## Prerequisites

- Node.js 16+ installed
- Backend server running on port 5000
- Dependencies installed (`npm install`)

## Troubleshooting

1. **Connection Issues**:
   - Ensure backend is running on port 5000
   - Check firewall settings
   - Verify CORS is configured on backend

2. **Dependencies Issues**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Port Already in Use**:
   - Change port in `vite.config.js`
   - Or kill the process using port 5173

