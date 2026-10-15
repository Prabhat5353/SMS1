# sms
# TeleSync: Multi-Device Telephony & SMS Forwarding System

TeleSync is an open-source, dual-layer communication framework designed to sync incoming SMS notifications and call records from secondary Android devices to a central administrative app via a lightweight JavaScript signaling/relay server. 

This project solves two common problems:
1. **Multi-device owners:** Users carrying two or more phones who need to track incoming alerts and calls on a primary interface without swapping SIM cards.
2. **Cost-effective local systems:** Self-hosted infrastructure for local services and platforms seeking to bypass expensive third-party SMS/telephony aggregators by using dedicated secondary Android hardware as an automated message bridge.

---

## Architecture Overview

The system consists of three distinct components:
[Client Device (Android) ]
│  (Reads Incoming SMS & Call Logs)
▼
[ Relay Server (Node.js / Express) ]
│  (WebSockets / REST Forwarding)
▼
[ Admin Device (Android) ]
(Real-time Dashboard & Historical View)

1. **Relay Server (JavaScript / Node.js):** Provides authentication, manages active sessions, and handles real-time payload delivery between registered client and admin nodes.
2. **Client App (Android / Java):** Runs background broadcast listeners to intercept incoming SMS payloads and poll telephony metadata (call logs), relaying them to the server in real time.
3. **Admin App (Android / Java):** Subscribes to client streams, rendering real-time message alerts and an indexed history of inbound/outbound calls.

---

## Features

- **Real-Time SMS Forwarding:** Broadcast receiver automatically intercepts incoming SMS messages and instantly pushes payload content (sender, timestamp, body) to the server.
- **Call History Sync:** Captures and indexes call logs (incoming, outgoing, missed) for quick remote inspection.
- **Zero Third-Party Gateway Cost:** Leverages native device connectivity, avoiding expensive carrier API and SMS gateway fees.
- **Lightweight Relay:** Minimal server footprint using standard JavaScript networking primitives.

---

## Tech Stack

- **Server:** JavaScript (Node.js, Express, Socket.io / WebSocket)
- **Mobile Apps (Client & Admin):** Java, Android SDK (API 26+)
- **Android Networking:** Retrofit / OkHttp / WebSockets
- **Background Operations:** Android BroadcastReceivers & WorkManager

---

## Prerequisites

- **Node.js:** v18.x or later installed on the server machine
- **Android Studio:** Ladybug or newer
- **JDK:** Version 17 or higher
- **Android Device/Emulator:** Running Android 8.0 (API Level 26) or higher with active cellular connectivity on the client device

---

## Getting Started

### 1. Server Setup

Navigate to the server directory and configure dependencies:

```bash
cd server
npm install
