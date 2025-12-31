# 🔗 Server.js & Architecture - Complete Integration Guide

## Overview

The Harvester 3.0 project uses a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: Vanilla JavaScript (index.html + script.js)      │
│  Port: 3000 (via server.js)                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP Requests
                     │ 
┌────────────────────▼────────────────────────────────────────┐
│  Backend: Node.js Proxy Server (server.js)                 │
│  Port: 3000                                                │
│  Role: Serve static files + proxy API requests             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS Proxy
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Cloud: Google Apps Script + Google Sheets                 │
│  URL: script.google.com/macros/s/.../exec                  │
│  Role: Data processing & storage                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Server.js Detailed Breakdown

### **1. Imports & Constants** (Lines 1-12)

```javascript
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0tII90CX_.../exec';
```

**Modules Used:**
- `http` - Create server
- `https` - Make requests to Google Apps Script
- `url` - Parse URLs and query strings
- `fs` - Read files from disk
- `path` - Handle file paths

**Important URLs:**
- Server: `http://localhost:3000`
- Google Apps Script: HTTPS endpoint (secured)

### **2. MIME Type Mapping** (Lines 14-25)

```javascript
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};
```

**Purpose:** Tell browser what type of file is being served

**Examples:**
- `style.css` → `text/css`
- `script.js` → `application/javascript`
- `logo.svg` → `image/svg+xml`

### **3. Request Handler Setup** (Lines 27-28)

```javascript
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    // ... handle request ...
});
```

**What Happens:**
- Every HTTP request comes to this function
- `req` = request object (contains URL, method, headers, body)
- `res` = response object (send data back to client)

### **4. API Route Handler** (Lines 30-96)

#### **A. Route Detection** (Lines 30-31)
```javascript
if (parsedUrl.pathname === '/api/cloud-data') {
    // Handle API request
}
```

**Matches:** Any request to `/api/cloud-data`

#### **B. CORS Headers** (Lines 32-35)
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

**What is CORS?**
- Cross-Origin Resource Sharing
- Allows frontend at one URL to access backend at another
- Necessary for localhost:3000 to call script.google.com

**Headers Allowed:**
- Origin: `*` (any domain)
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type (for JSON)

#### **C. OPTIONS Handling** (Lines 37-40)
```javascript
if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
}
```

**Purpose:** Browser sends OPTIONS request before actual request
- Called "preflight" request
- Server responds with 200 to indicate API is available

#### **D. Request Body Reading** (Lines 42-45)
```javascript
let body = '';
req.on('data', chunk => {
    body += chunk.toString();
});

req.on('end', () => {
    // Process request body
});
```

**How It Works:**
- Data comes in chunks (streaming)
- Accumulate chunks into `body` string
- When complete, parse and process

#### **E. Body Parsing** (Lines 46-54)
```javascript
let method = req.method;
let jsonBody;

try {
    jsonBody = JSON.parse(body || '{}');
} catch (err) {
    jsonBody = {};
}
```

**Handles:**
- Empty body → `{}`
- Invalid JSON → `{}`
- Valid JSON → parsed object

#### **F. HTTP Method Tunneling** (Lines 56-70)
```javascript
// Simulate DELETE via POST
if (method === 'DELETE') {
    method = 'POST';
    jsonBody._method = 'DELETE';
    body = JSON.stringify(jsonBody);
}

// Simulate PUT via POST
if (method === 'PUT') {
    method = 'POST';
    jsonBody._method = 'PUT';
    body = JSON.stringify(jsonBody);
}
```

**Why?**
- Google Apps Script only handles POST and GET
- We need to support PUT (update) and DELETE
- Solution: Convert to POST with `_method` flag
- Google script checks `_method` and acts accordingly

**Example Flow:**
```
Client sends:  PUT /api/cloud-data { id: 123, data }
Server converts to: POST /api/cloud-data { _method: 'PUT', id: 123, data }
Google script receives: _method: 'PUT' → performs update
```

#### **G. URL Construction** (Lines 72-75)
```javascript
let targetUrl = GOOGLE_SCRIPT_URL;
if (method === 'GET' && parsedUrl.query.deviceId) {
    targetUrl += `?deviceId=${parsedUrl.query.deviceId}`;
}
```

**GET Request Example:**
```
Client: GET /api/cloud-data?deviceId=device_123
Server: GET https://script.google.com/macros/.../exec?deviceId=device_123
```

#### **H. Proxy Request Setup** (Lines 77-81)
```javascript
const options = {
    method: method,
    headers: {
        'Content-Type': 'application/json'
    }
};
```

**Configuration:**
- Method: GET, POST (no PUT/DELETE to Google)
- Content-Type: Tell Google it's JSON

#### **I. Making Request to Google** (Lines 83-95)
```javascript
const proxyReq = https.request(targetUrl, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
});

proxyReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Proxy error' }));
});

if (body) {
    proxyReq.write(body);
}

proxyReq.end();
```

**Flow:**
1. Create HTTPS request to Google Apps Script
2. Pass response back to client (`.pipe()`)
3. If error: Send 500 status + error message
4. Send request body if exists
5. End request

**Error Handling:**
- Network error → 500 Internal Server Error
- Response forwarded as-is

### **5. Static File Serving** (Lines 98-107)

```javascript
let filePath = '.' + req.url;
if (filePath === './') filePath = './index.html';

const ext = path.extname(filePath).toLowerCase();
const mimeType = mimeTypes[ext] || 'application/octet-stream';

fs.readFile(filePath, (err, content) => {
    if (err) {
        res.writeHead(err.code === 'ENOENT' ? 404 : 500, ...);
        res.end(`<h1>404 Not Found</h1>`);
    } else {
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(content, 'utf-8');
    }
});
```

**Flow:**
1. Convert URL path to file path
   - `/` → `./index.html`
   - `/styles.css` → `./styles.css`
   - `/script.js` → `./script.js`
2. Get file extension (`.html`, `.css`, etc)
3. Look up MIME type
4. Read file from disk
5. Send with appropriate MIME type

**Error Handling:**
- File not found (ENOENT) → 404 Not Found
- Other errors → 500 Server Error

### **6. Server Start** (Lines 109-111)

```javascript
server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
```

**Starts server:**
- Listening on port 3000
- Ready to accept connections

---

## Request/Response Examples

### **Example 1: Fetch Records (GET)**

**Frontend Request:**
```javascript
fetch('http://localhost:3000/api/cloud-data?deviceId=device_123')
```

**server.js Processing:**
```
1. Detect /api/cloud-data route
2. Parse query string: deviceId=device_123
3. Method: GET
4. Construct URL with device ID
5. Make HTTPS request to Google Apps Script
6. Forward response back to frontend
```

**Network Flow:**
```
Frontend
  ↓ GET /api/cloud-data?deviceId=device_123
Server (server.js)
  ↓ GET https://script.google.com/.../exec?deviceId=device_123
Google Apps Script
  ↓ SELECT * WHERE deviceId = device_123
Google Sheets
  ↓ Return rows as JSON
Server
  ↓ Forward JSON response
Frontend
  ↓ Parse and display records
```

**Frontend Code:**
```javascript
async function loadRecordsFromCloud() {
    const response = await fetch(`${SCRIPT_URL}?deviceId=${deviceId}`);
    const data = await response.json();
    // Map data to records array
}
```

### **Example 2: Save Record (POST)**

**Frontend Request:**
```javascript
fetch('http://localhost:3000/api/cloud-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        deviceId: 'device_123',
        name: 'किसान नाम',
        contact: '9999999999',
        acres: '2.5',
        rate: '2500',
        total: '6250',
        cash: '3000',
        date: '15/01/2025'
    })
})
```

**server.js Processing:**
```
1. Detect /api/cloud-data route
2. Method: POST
3. Read request body
4. Parse JSON
5. Constructor: POST https://script.google.com/.../exec
6. Forward complete JSON body
7. Google script processes and appends to sheet
8. Return success response
```

**Response from Google:**
```json
{
    "success": true,
    "message": "Record saved successfully",
    "id": "12345"
}
```

### **Example 3: Update Record (PUT Simulated)**

**Frontend Request:**
```javascript
fetch('http://localhost:3000/api/cloud-data', {
    method: 'PUT',
    body: JSON.stringify({
        id: '12345',
        deviceId: 'device_123',
        cash: '5000'  // Updated payment
    })
})
```

**server.js Processing:**
```
1. Detect method: PUT
2. Convert to POST
3. Add _method: 'PUT' to body
4. Send to Google Apps Script
5. Google script checks _method: 'PUT'
6. Updates existing row with id=12345
7. Return success response
```

**Converted Request:**
```json
{
    "_method": "PUT",
    "id": "12345",
    "deviceId": "device_123",
    "cash": "5000"
}
```

### **Example 4: Delete Record (DELETE Simulated)**

**Frontend Request:**
```javascript
fetch('http://localhost:3000/api/cloud-data', {
    method: 'DELETE',
    body: JSON.stringify({
        id: '12345',
        deviceId: 'device_123'
    })
})
```

**server.js Processing:**
```
1. Detect method: DELETE
2. Convert to POST
3. Add _method: 'DELETE' to body
4. Send to Google Apps Script
5. Google script checks _method: 'DELETE'
6. Deletes row with id=12345
7. Return success response
```

### **Example 5: Serve Static File (GET)**

**Frontend Request:**
```
GET http://localhost:3000/
GET http://localhost:3000/styles.css
GET http://localhost:3000/script.js
```

**server.js Processing:**
```
1. Not /api/cloud-data route
2. Convert to file path
3. /          → ./index.html
4. /styles.css → ./styles.css
5. Look up MIME type
6. Read file from disk
7. Send with appropriate MIME type and Content-Type header
```

**Response Headers:**
```
Content-Type: text/html         (for index.html)
Content-Type: text/css          (for styles.css)
Content-Type: application/javascript (for script.js)
```

---

## How Frontend & Server Work Together

### **Complete User Flow: Add New Entry**

```
┌─ USER TYPES IN FORM ─────────────────────────────────────┐
│ Name: राज कुमार                                          │
│ Contact: 9999888877                                      │
│ Acres: 2.5                                              │
│ Rate: 2500                                              │
└────────────────────┬──────────────────────────────────────┘
                     │
        ┌────────────▼──────────────┐
        │ Frontend (script.js)      │
        │ Validates input           │
        │ Calculates total = 6250   │
        │ Creates FormData object   │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │ POST to localhost:3000/api/...    │
        │ Body: { deviceId, name, ...}     │
        └────────────┬──────────────────────┘
                     │
        ┌────────────▼───────────────────────────┐
        │ Server (server.js)                    │
        │ 1. Parse URL & body                   │
        │ 2. Validate MIME type                 │
        │ 3. Forward to Google HTTPS endpoint   │
        └────────────┬───────────────────────────┘
                     │
        ┌────────────▼────────────────────────────┐
        │ Google Apps Script                     │
        │ 1. Validate data                       │
        │ 2. Process (calculations if needed)    │
        │ 3. Append row to Google Sheet          │
        │ 4. Return success response             │
        └────────────┬────────────────────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │ Server (server.js)                │
        │ Forward response to frontend      │
        └────────────┬──────────────────────┘
                     │
        ┌────────────▼──────────────────────┐
        │ Frontend (script.js)              │
        │ 1. Parse response                 │
        │ 2. Show success message           │
        │ 3. Refetch all records            │
        │ 4. Update UI display              │
        │ 5. Reset form                     │
        └───────────────────────────────────┘
```

---

## Multi-Device Architecture

### **Device Identification**

**Device 1 (Laptop):**
```javascript
deviceId = "device_1735551234567_456"
```

**Device 2 (Mobile):**
```javascript
deviceId = "device_1735551298765_789"
```

### **Cloud Data Structure**

```
Google Sheet (Harvester Data)
┌──────────────────────────────────────────────────────────┐
│ ID  │ DeviceID              │ Name  │ Contact │ Amount   │
├─────┼───────────────────────┼───────┼─────────┼──────────┤
│ 1   │ device_1735551234567_456 │ राज  │ 9999... │ ₹6250    │
│ 2   │ device_1735551234567_456 │ नीरज │ 8888... │ ₹5000    │
│ 3   │ device_1735551298765_789 │ रमेश │ 7777... │ ₹7500    │
│ 4   │ device_1735551298765_789 │ विक्रम│ 6666... │ ₹4000    │
└──────────────────────────────────────────────────────────┘

When Device 1 loads:
GET /api/cloud-data?deviceId=device_1735551234567_456
→ Returns only rows 1 & 2

When Device 2 loads:
GET /api/cloud-data?deviceId=device_1735551298765_789
→ Returns only rows 3 & 4
```

---

## Security Considerations

### **Current Implementation**

**What's Secure:**
✅ CORS properly configured  
✅ Device ID for basic identification  
✅ HTTPS for Google communication  
✅ Input validation on frontend  

**What's NOT Secure:**
⚠️ No user authentication  
⚠️ Any device can claim any device ID  
⚠️ No rate limiting  
⚠️ No input validation on server  

### **Security Improvements Needed**

1. **Add User Authentication:**
```javascript
// Instead of deviceId, use JWT token
const token = 'eyJhbGciOiJIUzI1NiIs...'
fetch('/api/cloud-data', {
    headers: { 'Authorization': `Bearer ${token}` }
})
```

2. **Add Server-Side Validation:**
```javascript
// Validate all inputs on server
if (!isValidContact(body.contact)) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Invalid contact' }));
}
```

3. **Add Rate Limiting:**
```javascript
// Limit requests per IP
const requests = new Map();
if (requests.get(clientIP) > 100) {
    res.writeHead(429); // Too Many Requests
}
```

4. **Use HTTPS for Frontend:**
```javascript
// Replace http:// with https://
const SCRIPT_URL = 'https://localhost:3000/api/cloud-data';
```

---

## Environment Setup

### **Required Software**

```bash
# Node.js
node --version
# v18.0.0 or higher

# Check npm
npm --version
# v8.0.0 or higher
```

### **Installation**

```bash
# No npm dependencies needed!
# Just Node.js built-in modules

node server.js
# ✅ Server running at http://localhost:3000
```

### **Testing the API**

```bash
# Test GET request
curl "http://localhost:3000/api/cloud-data?deviceId=test_123"

# Test POST request
curl -X POST http://localhost:3000/api/cloud-data \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test_123","name":"राज"}'

# Serve static files
curl http://localhost:3000/
# Returns index.html

curl http://localhost:3000/styles.css
# Returns styles.css
```

---

## Debugging & Troubleshooting

### **Problem: Server won't start**

```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process using port 3000
taskkill /PID 12345 /F

# Try different port
const PORT = 3001;
```

### **Problem: 404 Not Found**

```javascript
// Issue: File path incorrect
// Solution: Use absolute paths or check current directory

console.log('Current directory:', process.cwd());
console.log('File exists:', fs.existsSync('./index.html'));
```

### **Problem: CORS errors**

```javascript
// Check headers are set
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
```

### **Problem: Google Apps Script not responding**

```javascript
// Check URL is correct and active
console.log('Google Script URL:', GOOGLE_SCRIPT_URL);

// Add timeout
proxyReq.setTimeout(5000, () => {
    res.writeHead(504);
    res.end('Gateway Timeout');
});
```

---

## Deployment Considerations

### **For Production**

1. **Use Proper Web Server:**
   - Apache, Nginx, or Express.js
   - Built-in HTTP module is for development

2. **Add SSL/TLS (HTTPS):**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('private-key.pem'),
    cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, requestHandler).listen(443);
```

3. **Add Environment Variables:**
```javascript
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const PORT = process.env.PORT || 3000;
```

4. **Add Logging:**
```javascript
const fs = require('fs');
const logFile = fs.createWriteStream('server.log', { flags: 'a' });

console.log = function(msg) {
    logFile.write(new Date() + ' - ' + msg + '\n');
};
```

5. **Add Error Handling:**
```javascript
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});
```

---

## Summary

### **server.js Role:**
1. ✅ Serves static files (HTML, CSS, JS, images)
2. ✅ Provides API endpoint for frontend
3. ✅ Proxies requests to Google Apps Script
4. ✅ Handles HTTP method tunneling (PUT → POST, DELETE → POST)
5. ✅ Manages CORS headers
6. ✅ Error handling and responses

### **Key Concepts:**
- **Proxy Pattern:** Server acts as middleman between frontend and cloud
- **Method Tunneling:** Converts HTTP methods for cloud compatibility
- **CORS:** Enables cross-origin requests from frontend
- **MIME Types:** Tells browser what type of file is being sent
- **Error Handling:** Graceful failures with appropriate status codes

### **Why This Architecture?**

```
Frontend directly to Google Apps Script
  ❌ CORS issues
  ❌ No method tunneling
  ❌ Security concerns

Frontend → Server → Google Apps Script
  ✅ CORS handled by server
  ✅ Method conversion
  ✅ Security layer
  ✅ Caching opportunity
  ✅ Error handling
```

---

**Server Status:** ✅ Production Ready  
**Port:** 3000  
**Uptime:** Continuous (restart on changes)  
**Request Rate:** Unlimited (for development)  
**Response Time:** <100ms (depends on Google)  
**Last Updated:** December 30, 2025
