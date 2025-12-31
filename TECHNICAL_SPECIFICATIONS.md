# 🔧 Technical Specifications & Architecture Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    HARVESTER 3.0 APP                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐         ┌──────────────────────┐  │
│  │   VANILLA JS APP     │         │   ANGULAR APP        │  │
│  │   (index.html)       │         │   (ng-Harvester/)    │  │
│  │                      │         │                      │  │
│  │ - script.js (1200L)  │         │ - Components         │  │
│  │ - styles.css         │         │ - Material UI        │  │
│  │ - localStorage       │         │ - TypeScript         │  │
│  │ - 5 Tab Pages        │         │ - Routing            │  │
│  └──────────┬───────────┘         └──────────┬───────────┘  │
│             │                                 │              │
│             └─────────┬───────────────────────┘              │
│                       │                                       │
│                   localStorage                               │
│                       │                                       │
├───────────────────────┼───────────────────────────────────────┤
│                       │                                        │
│    ┌──────────────────▼─────────────────┐                    │
│    │   NODE.JS SERVER (server.js:3000)  │                    │
│    │   - Static File Server              │                    │
│    │   - API Proxy                       │                    │
│    │   - CORS Handler                    │                    │
│    └──────────────────┬─────────────────┘                    │
│                       │                                        │
│         HTTPS Request │                                        │
│                       ▼                                        │
│    ┌──────────────────────────────────┐                      │
│    │  GOOGLE APPS SCRIPT (Cloud)      │                      │
│    │  - Record Processing             │                      │
│    │  - Data Validation               │                      │
│    └──────────────────┬───────────────┘                      │
│                       │                                        │
│                       ▼                                        │
│    ┌──────────────────────────────────┐                      │
│    │  GOOGLE SHEETS (Database)        │                      │
│    │  - Persistent Storage            │                      │
│    │  - Device ID partitioning        │                      │
│    └──────────────────────────────────┘                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend - Vanilla JS (index.html + script.js)

#### HTML Structure:
```
<body>
  ├── <header class="modern-header">
  │   ├── Theme Toggle
  │   ├── Greeting Section
  │   └── Balance Card (with action buttons)
  │
  ├── <main class="main-content">
  │   ├── #entry-tab (Form)
  │   ├── #records-tab (List view)
  │   ├── #summary-tab (Analytics)
  │   ├── #settings-tab (Preferences)
  │   └── #more-tab (Additional)
  │
  └── <nav class="modern-bottom-nav">
      └── 5 Navigation Items
```

#### JavaScript Modules (script.js - 1200+ lines):

| Module | Purpose | Key Functions |
|--------|---------|----------------|
| **Initialization** | App startup | `DOMContentLoaded`, `initializeDeviceId`, `initializeTheme` |
| **Form Handling** | Entry creation | `handleFormSubmit`, `updateCalculations`, `validateInputs` |
| **Data Management** | CRUD operations | `loadRecords`, `saveRecords`, `editRecord`, `deleteRecord` |
| **Search & Filter** | Record lookup | `handleSearch`, `getFilteredRecordsByPeriod` |
| **Analytics** | Stats display | `updateSummary`, `animateCounterUpdate` |
| **UI/UX** | User interaction | `switchTab`, `toggleRecordCard`, `showMessage` |
| **Cloud Sync** | Server communication | `loadRecordsFromCloud`, `saveRecordsCloud` |
| **Utilities** | Helpers | `debounce`, `parseDate`, `formatDate` |

---

### 2. Frontend - Angular (ng-Harvester/)

#### Component Tree:
```
AppComponent (Root)
├── HeaderComponent
├── RouterOutlet
│   ├── DashboardComponent
│   ├── AddNewComponent
│   ├── RecordsComponent
│   ├── SettingsComponent
│   └── MoreComponent
└── Floating Navigation
```

#### Component Details:

| Component | Purpose | Files |
|-----------|---------|-------|
| **App** | Root, routes, nav | app.ts, app.html, app.scss |
| **Header** | Top bar | header.component.* |
| **Dashboard** | Stats/Overview | dashboard.component.* |
| **AddNew** | Entry form | add-new.component.* |
| **Records** | Record list | records.component.* |
| **Settings** | Preferences | settings.component.* |
| **More** | Extra options | more.component.* |

#### Material Modules Used:
- MatCard, MatCardHeader, MatCardTitle, MatCardContent
- MatFormField, MatLabel, MatInput, MatSuffix
- MatIcon, MatButton
- MatDatepicker, MatDatepickerInput, MatDatepickerToggle

---

### 3. Backend - Node.js Server

#### server.js Structure:
```javascript
const PORT = 3000
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/...'

HTTP Server with:
├── /api/cloud-data endpoint
│   ├── GET (fetch records)
│   ├── POST (create/update)
│   ├── PUT → POST with _method flag
│   ├── DELETE → POST with _method flag
│   └── OPTIONS (CORS)
│
└── Static File Server
    ├── Serves HTML, CSS, JS, images
    └── Auto-serves index.html on /
```

#### CORS Configuration:
```javascript
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Data Flow Diagrams

### 1. Create Record Flow
```
User Form Input
    ↓
Client-Side Validation (JavaScript)
    ↓
Real-Time Calculation (Land × Rate)
    ↓
POST /api/cloud-data
    ↓
Node.js Server (Proxy)
    ↓
HTTPS → Google Apps Script
    ↓
Google Sheets Write
    ↓
Response JSON
    ↓
localStorage Update
    ↓
UI Update + Success Toast
```

### 2. Search & Filter Flow
```
User Types in Search Box
    ↓
debounce(300ms)
    ↓
Filter Local Array (records[])
    ↓
Match on: name, contact, date
    ↓
Update filteredRecords[]
    ↓
displayRecords() with animation
```

### 3. Period-Based Analytics Flow
```
User Clicks Period Button (Today/Week/Month/All)
    ↓
selectPeriod() sets selectedPeriod variable
    ↓
getFilteredRecordsByPeriod() processes records
    ↓
calculateStats():
  ├── Count records
  ├── Sum land acres
  ├── Sum payments
  ├── Sum pending
  └── Calculate averages
    ↓
updateSummary() with animations
    ↓
Display stat cards
```

---

## State Management & Storage

### LocalStorage Schema:
```javascript
{
  "deviceId": "device_1735508400000_456",
  "theme": "dark" | "light",
  "records": [
    {
      "id": "1735508400000_789",
      "deviceId": "device_1735508400000_456",
      "farmerName": "राज कुमार",
      "contactNumber": "9876543210",
      "date": "2025-12-30",
      "landInAcres": 5.5,
      "ratePerAcre": 2500,
      "totalPayment": 13750,
      "nakadPaid": 10000,
      "fullPaymentDate": "2025-12-31",
      "createdAt": "2025-12-30T10:30:00Z",
      "updatedAt": "2025-12-30T10:30:00Z"
    }
  ]
}
```

### Memory State (JavaScript Variables):
```javascript
records = []              // All records from cloud/local
filteredRecords = []      // Search/filtered results
selectedPeriod = 'all'    // Current analytics period
activeRoute = '/entry'    // Current tab
deviceId = ''             // Unique device identifier
```

### Angular Signals:
```typescript
protected activeRoute = signal('/dashboard')
protected navItems = signal<NavItem[]>([...])
protected stats = signal<StatCard[]>([])
```

---

## Form Validation Rules

### Farmer Name
- ✅ Required
- ✅ Any Unicode characters (supports Hindi)
- ❌ Empty strings not allowed

### Contact Number
- ✅ Required
- ✅ Exactly 10 digits
- ✅ Numeric only
- ❌ Letters, special characters rejected

### Land in Acres
- ✅ Required
- ✅ Decimal allowed (e.g., 5.5)
- ✅ Minimum: > 0
- ❌ Zero or negative values rejected

### Rate per Acre
- ✅ Optional (default: 2500)
- ✅ Decimal allowed
- ✅ Minimum: > 0
- ❌ Zero or negative values rejected

### Cash Payment (नकद भुगतान)
- ✅ Optional
- ✅ Default: 0
- ✅ Cannot exceed total amount
- ⚠️ Warning if > total

### Date
- ✅ Auto-filled with today's date
- ✅ User can change
- ✅ Format: YYYY-MM-DD (internal), DD/MM/YYYY (display)

---

## Calculation Logic

### Total Amount
```
Total = Land (acres) × Rate (₹/acre)
Example: 5.5 × 2500 = ₹13,750
```

### Pending Amount
```
Pending = Total - Cash Paid
Example: 13,750 - 10,000 = ₹3,750
```

### Payment Status
```
if Pending ≤ 0 → Status: "पूरा भुगतान" (Fully Paid)
if Pending > 0 → Status: "₹{Pending}" (Pending)
```

### Analytics Calculations
```
Total Records = COUNT of filtered records
Total Land = SUM of landInAcres
Total Payment = SUM of totalPayment
Total Pending = SUM of (totalPayment - nakadPaid)

Average Land/Record = Total Land / Total Records
Average Payment/Record = Total Payment / Total Records
Average Rate/Acre = Total Payment / Total Land
```

---

## API Request/Response Examples

### GET Records
**Request:**
```
GET http://localhost:3000/api/cloud-data?deviceId=device_1735508400000_456
```

**Response:**
```json
{
  "success": true,
  "records": [
    {
      "id": "1735508400000_789",
      "farmerName": "राज शर्मा",
      "contactNumber": "9876543210",
      "date": "2025-12-30",
      "landInAcres": 5.5,
      "ratePerAcre": 2500,
      "totalPayment": 13750,
      "nakadPaid": 10000,
      "fullPaymentDate": "2025-12-31",
      "createdAt": "2025-12-30T10:30:00Z",
      "updatedAt": "2025-12-30T10:30:00Z"
    }
  ]
}
```

### POST Create Record
**Request:**
```json
POST /api/cloud-data
Content-Type: application/json

{
  "farmerName": "राज शर्मा",
  "contactNumber": "9876543210",
  "date": "2025-12-30",
  "landInAcres": 5.5,
  "ratePerAcre": 2500,
  "totalPayment": 13750,
  "nakadPaid": 10000,
  "fullPaymentDate": "2025-12-31",
  "deviceId": "device_1735508400000_456"
}
```

**Response:**
```json
{
  "success": true,
  "id": "1735508400000_789",
  "message": "Record created successfully"
}
```

### PUT Update Record
**Request:**
```json
POST /api/cloud-data
Content-Type: application/json

{
  "_method": "PUT",
  "id": "1735508400000_789",
  "nakadPaid": 13750,
  "fullPaymentDate": "2025-12-30"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Record updated successfully"
}
```

### DELETE Record
**Request:**
```json
POST /api/cloud-data
Content-Type: application/json

{
  "_method": "DELETE",
  "id": "1735508400000_789",
  "deviceId": "device_1735508400000_456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Record deleted successfully"
}
```

---

## UI/UX Component Details

### Navigation Items
```
1. एंट्री (Entry)      → Tab: #entry-tab        → Route: /add-new
2. रिकॉर्ड (Records)   → Tab: #records-tab      → Route: /records
3. सारांश (Summary)   → Tab: #summary-tab      → Route: /dashboard
4. सेटिंग (Settings)  → Tab: #settings-tab     → Route: /settings
5. अन्य (More)        → Tab: #more-tab         → Route: /more
```

### Stat Cards (Summary Tab)
```
Card 1: कुल रिकॉर्ड (Primary Blue)
        Icon: users
        Value: Count
        
Card 2: कुल ज़मीन (Secondary)
        Icon: map-pin
        Value: Total acres
        
Card 3: कुल भुगतान (Success Green)
        Icon: indian-rupee
        Value: Total amount
        
Card 4: कुल बकाया (Warning Orange)
        Icon: alert-circle
        Value: Total pending
```

### Record Card Structure
```
Compact View:
├── Farmer Avatar (First Letter)
├── Farmer Name
├── Contact Number (with icon)
└── Pending Amount / Full Payment Badge
    └── Expand Chevron

Expanded View:
├── All Details (6+ fields)
├── Edit/Delete Buttons
└── Collapse Chevron
```

---

## Responsive Breakpoints

```css
/* Mobile First */
Mobile (< 480px):
  - Full width cards
  - Stacked layout
  - Smaller fonts
  - Adjusted nav sizing

Tablet (480px - 768px):
  - 2-column layouts
  - Medium fonts
  - Horizontal forms

Desktop (> 768px):
  - Multi-column grids
  - Max-width containers
  - Larger UI elements
```

---

## Performance Metrics

| Metric | Target | Implementation |
|--------|--------|-----------------|
| **First Paint** | < 1s | Static files cached |
| **Form Validation** | Real-time | Debounced (300ms) |
| **Search Response** | < 300ms | Debounced filtering |
| **Cloud Sync** | Async | Non-blocking |
| **Animation FPS** | 60 FPS | CSS transforms |

---

## Error Handling Strategy

### Try-Catch Blocks
```javascript
- loadRecords(): Catches JSON parse errors
- saveRecords(): Catches network errors
- editRecord(): Catches API errors
- deleteRecord(): Handles confirmation
```

### User Feedback
```javascript
- Success: Green toast, checkmark icon
- Error: Red toast, alert icon
- Warning: Orange toast, warning icon
- Info: Blue toast, info icon
```

### Network Fallback
```
If cloud sync fails:
  1. Keep localStorage as source of truth
  2. Show error toast
  3. Retry on next operation
  4. Display offline indicator (future)
```

---

## Security Considerations

### Current Implementation:
- ✅ Device ID for multi-device tracking
- ✅ No authentication (for MVP)
- ✅ Input validation (client-side)
- ✅ CORS headers configured
- ✅ HTTPS to Google Apps Script

### Future Improvements:
- 🔒 User authentication
- 🔒 Server-side validation
- 🔒 Data encryption
- 🔒 Rate limiting
- 🔒 Input sanitization

---

## Accessibility Features

| Feature | Implementation |
|---------|-----------------|
| **Semantic HTML** | header, main, nav, form |
| **ARIA Labels** | aria-label on buttons |
| **Color Contrast** | WCAG AA compliant |
| **Keyboard Nav** | Tab, Enter, Escape support |
| **Screen Readers** | Proper heading hierarchy |
| **Icons + Text** | Lucide icons with labels |
| **Mobile Touch** | 48px minimum touch targets |

---

## Browser DevTools Tips

### Console Commands:
```javascript
// View all records
console.log(records)

// Check device ID
console.log(localStorage.getItem('deviceId'))

// View current theme
console.log(document.documentElement.getAttribute('data-theme'))

// Clear all data (careful!)
localStorage.clear()
```

### Network Tab:
- Monitor `/api/cloud-data` requests
- Check response timing
- Verify CORS headers
- Inspect request payloads

### Application Tab:
- View localStorage contents
- Check device ID
- Verify theme preference

---

## Development Workflow

### Local Testing:
```bash
# Start server
npm start
# Opens http://localhost:3000

# Server watches for file changes
# Refresh browser to see updates
```

### Angular Development:
```bash
# From ng-Harvester directory
ng serve
# Opens http://localhost:4200

# Hot reload on file changes
```

### Cloud Testing:
- Uses real Google Apps Script
- Data persists in Google Sheets
- Device ID required for sync
- Check Google Sheets for data

---

## File Size & Performance

| File | Size | Role |
|------|------|------|
| script.js | ~1200 lines | Core logic |
| styles.css | ~800 lines | Styling |
| index.html | ~300 lines | Markup |
| server.js | ~120 lines | Backend |

**Total Bundle:** ~30KB (uncompressed)

---

## Version History

**v3.0 (Current)**
- ✅ Angular integration with floating nav
- ✅ SVG icon implementation
- ✅ Dark theme by default
- ✅ Responsive design
- ✅ Cloud sync

**v2.0**
- Entry management system
- Record search & filter
- Analytics dashboard
- Mobile-optimized UI

**v1.0**
- Initial release
- Basic form & list view

---

## Future Roadmap

- [ ] User authentication (OAuth)
- [ ] Data export/import (CSV, Excel)
- [ ] Offline-first sync queue
- [ ] Photo/document upload
- [ ] Receipt generation
- [ ] Farmer profiles
- [ ] Payment history
- [ ] Multi-language support (expand)
- [ ] PWA support
- [ ] Database migration

---

## Support & Resources

- **Google Apps Script Docs:** https://developers.google.com/apps-script
- **Angular Docs:** https://angular.io
- **Material Design:** https://material.io
- **Lucide Icons:** https://lucide.dev

---

**Document Version:** 1.0  
**Last Updated:** December 30, 2025  
**Maintained By:** Development Team
