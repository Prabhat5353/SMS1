import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 4000;

// In-Memory state ONLY (Zero Database Storage)
const clients = new Map();
const admins = new Set();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Root landing endpoint for Render
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>OmniSync Zero-DB Relay Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #07090e; color: #f0f4f8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: rgba(18, 24, 38, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; text-align: center; max-width: 480px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
          h1 { color: #00f2fe; margin-bottom: 8px; font-size: 1.6rem; }
          p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 24px; }
          .badge { background: rgba(0, 230, 118, 0.15); color: #00e676; border: 1px solid rgba(0,230,118,0.3); padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 0.8rem; }
          .stats { margin-top: 24px; text-align: left; font-size: 0.85rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 OmniSync Relay Server</h1>
          <p>Zero-Database Real-Time SMS & Call Relay Platform hosted on Render</p>
          <span class="badge">● ONLINE & ACTIVE</span>
          <div class="stats">
            <div>• Active Developer Phones: <strong>${clients.size}</strong></div>
            <div>• Active Admin Connections: <strong>${admins.size}</strong></div>
            <div>• WebSocket URL: <strong>wss://${req.headers.host}</strong></div>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Health check REST endpoint for Render uptime checks
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    relayMode: 'Zero-Database In-Memory Relay',
    activeClientsCount: clients.size,
    activeAdminsCount: admins.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/devices', (req, res) => {
  const deviceList = Array.from(clients.values()).map(client => ({
    deviceId: client.deviceId,
    deviceName: client.deviceName,
    simCards: client.simCards,
    batteryLevel: client.batteryLevel,
    lastPing: client.lastPing,
    connectedAt: client.connectedAt
  }));
  res.json(deviceList);
});

function broadcastToAdmins(data) {
  const message = JSON.stringify(data);
  for (const adminWs of admins) {
    if (adminWs.readyState === WebSocket.OPEN) {
      adminWs.send(message);
    }
  }
}

function notifyAdminsDeviceStatusChange() {
  const activeDevices = Array.from(clients.values()).map(c => ({
    deviceId: c.deviceId,
    deviceName: c.deviceName,
    simCards: c.simCards,
    batteryLevel: c.batteryLevel,
    lastPing: c.lastPing,
    connectedAt: c.connectedAt
  }));

  broadcastToAdmins({
    type: 'DEVICE_LIST_UPDATE',
    devices: activeDevices,
    timestamp: new Date().toISOString()
  });
}

wss.on('connection', (ws, req) => {
  console.log(`[WebSocket Server] New connection from ${req.socket.remoteAddress}`);
  
  let currentDeviceId = null;
  let clientRole = 'unknown';

  ws.on('message', (rawMessage) => {
    try {
      const parsed = JSON.parse(rawMessage.toString());
      const { type, payload } = parsed;

      switch (type) {
        case 'REGISTER_CLIENT': {
          clientRole = 'client';
          currentDeviceId = payload.deviceId;
          
          clients.set(currentDeviceId, {
            ws,
            deviceId: payload.deviceId,
            deviceName: payload.deviceName || `Phone-${payload.deviceId.substring(0, 6)}`,
            simCards: payload.simCards || [],
            batteryLevel: payload.batteryLevel || 100,
            lastPing: new Date().toISOString(),
            connectedAt: new Date().toISOString()
          });

          console.log(`[Relay] Client Registered: ${payload.deviceName} (${payload.deviceId})`);
          
          ws.send(JSON.stringify({
            type: 'REGISTER_SUCCESS',
            deviceId: currentDeviceId,
            timestamp: new Date().toISOString()
          }));

          notifyAdminsDeviceStatusChange();
          break;
        }

        case 'REGISTER_ADMIN': {
          clientRole = 'admin';
          admins.add(ws);
          console.log(`[Relay] Admin Connected. Total Admins: ${admins.size}`);

          ws.send(JSON.stringify({
            type: 'INITIAL_ADMIN_STATE',
            devices: Array.from(clients.values()).map(c => ({
              deviceId: c.deviceId,
              deviceName: c.deviceName,
              simCards: c.simCards,
              batteryLevel: c.batteryLevel,
              lastPing: c.lastPing,
              connectedAt: c.connectedAt
            })),
            timestamp: new Date().toISOString()
          }));
          break;
        }

        case 'SMS_EVENT': {
          console.log(`[Relay] SMS Received from Device ${currentDeviceId || payload.deviceId} (Sender: ${payload.sender})`);
          
          broadcastToAdmins({
            type: 'SMS_EVENT',
            deviceId: payload.deviceId || currentDeviceId,
            deviceName: payload.deviceName,
            simSlot: payload.simSlot,
            carrierName: payload.carrierName,
            simNumber: payload.simNumber,
            sender: payload.sender,
            messageBody: payload.messageBody,
            receivedAt: payload.receivedAt || new Date().toISOString(),
            timestamp: new Date().toISOString()
          });
          break;
        }

        case 'CALL_EVENT': {
          console.log(`[Relay] Call Event from Device ${currentDeviceId || payload.deviceId} (State: ${payload.callState})`);
          
          broadcastToAdmins({
            type: 'CALL_EVENT',
            deviceId: payload.deviceId || currentDeviceId,
            deviceName: payload.deviceName,
            simSlot: payload.simSlot,
            carrierName: payload.carrierName,
            phoneNumber: payload.phoneNumber,
            callState: payload.callState,
            durationSeconds: payload.durationSeconds || 0,
            receivedAt: payload.receivedAt || new Date().toISOString(),
            timestamp: new Date().toISOString()
          });
          break;
        }

        case 'HEARTBEAT': {
          if (currentDeviceId && clients.has(currentDeviceId)) {
            const client = clients.get(currentDeviceId);
            client.lastPing = new Date().toISOString();
            if (payload && payload.batteryLevel !== undefined) {
              client.batteryLevel = payload.batteryLevel;
            }
            notifyAdminsDeviceStatusChange();
          }
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          break;
        }

        default:
          console.warn(`[Relay] Unknown message type: ${type}`);
      }
    } catch (err) {
      console.error(`[Relay Error] Failed to parse message:`, err.message);
    }
  });

  ws.on('close', () => {
    if (clientRole === 'client' && currentDeviceId) {
      console.log(`[Relay] Client Disconnected: ${currentDeviceId}`);
      clients.delete(currentDeviceId);
      notifyAdminsDeviceStatusChange();
    } else if (clientRole === 'admin') {
      console.log(`[Relay] Admin Disconnected.`);
      admins.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WebSocket Error]`, err.message);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [deviceId, client] of clients.entries()) {
    const lastPingTime = new Date(client.lastPing).getTime();
    if (now - lastPingTime > 60000) {
      try { client.ws.terminate(); } catch (e) {}
      clients.delete(deviceId);
      notifyAdminsDeviceStatusChange();
    }
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`🚀 Zero-DB Relay Server listening on port ${PORT}`);
});
