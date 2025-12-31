# 🌾 Harvester 3.0 - Project Documentation

## 📋 Project Overview

**Project Name:** हार्वेस्टर ट्रैकर (Harvester Cutting Tracker)  
**Version:** 3.0  
**Language:** Hindi (Devanagari) + English  
**Type:** Full-Stack Web Application  
**Purpose:** Track harvester cutting operations and payments for farmers

---

## 🏗️ Project Architecture

The project is a **hybrid application** with TWO main implementations:

### 1️⃣ Vanilla JavaScript App (Legacy/Primary)
- **Location:** Root directory (`/`)
- **Files:** `index.html`, `script.js`, `styles.css`
- **Features:** Fully functional with local storage and cloud sync
- **Status:** Production-ready

### 2️⃣ Angular Application (Modern/In Development)
- **Location:** `/ng-Harvester/`
- **Framework:** Angular 20+ with TypeScript
- **UI Components:** Angular Material
- **Status:** Component structure ready, needs data integration

### 3️⃣ Backend Server
- **File:** `server.js` (Node.js)
- **Port:** 3000
- **Type:** Proxy + Static File Server
- **Cloud Integration:** Google Apps Script

---

## 📁 Folder Structure

```
Harvester 3.0/
├── 📄 index.html              (Vanilla JS app - main entry)
├── 📄 script.js               (Main app logic - 1200+ lines)
├── 📄 styles.css              (Styles for vanilla app)
├── 📄 server.js               (Node.js backend proxy server)
├── 📄 package.json            (Node dependencies)
├── 📁 ng-Harvester/           (Angular project)
│   ├── angular.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── styles.scss
│   │   └── app/
│   │       ├── app.ts         (Main component)
│   │       ├── app.html       (Template with floating nav)
│   │       ├── app.scss       (Styles with floating nav design)
│   │       ├── app.routes.ts  (Route configuration)
│   │       ├── core/
│   │       │   └── guards/
│   │       │       └── auth.guard.ts
│   │       ├── features/
│   │       │   ├── add-new/      (Add entry form)
│   │       │   ├── dashboard/    (Statistics & overview)
│   │       │   ├── records/      (View all records)
│   │       │   ├── settings/     (App settings)
│   │       │   └── more/         (Additional options)
│   │       └── shared/
│   │           └── components/
│   │               └── header/   (Top header component)
├── 📁 assets/
│   └── images/

```

---

## 🎯 Core Functionalities

### 1. **Entry Management** (Add New Records)
**Purpose:** Record harvester cutting operations for farmers

#### Fields Collected:
- 👤 **किसान का नाम** (Farmer Name) - Text
- 📞 **संपर्क नंबर** (Contact Number) - 10 digits only
- 📅 **तारीख** (Date) - Auto-filled with current date, editable
- 🌾 **ज़मीन (एकड़)** (Land in Acres) - Decimal number
- 💵 **प्रति एकड़ दर** (Rate per Acre) - Default ₹2500, decimal
- 🧮 **कुल राशि** (Total Amount) - Auto-calculated (Land × Rate)
- 💰 **नकद भुगतान** (Cash Payment) - Amount paid immediately
- 📋 **पूरा भुगतान तारीख** (Full Payment Date) - Optional, when fully paid
- 🔔 **बकाया राशि** (Pending Amount) - Auto-calculated (Total - Paid)

#### Validation:
- Land value must be > 0
- Rate must be > 0
- Contact must be exactly 10 digits
- Pending amount cannot exceed total
- Real-time calculation and feedback

---

### 2. **Records Management**
**Purpose:** View, search, edit, and delete all farmer records

#### Features:
- **List View:** Compact cards showing:
  - Farmer avatar (first letter)
  - Farmer name
  - Contact number with icon
  - Pending/Paid status (color-coded)
  - Expand/collapse chevron

- **Expanded View:** Full record details:
  - Date, Land (acres), Rate, Total, Paid, Pending
  - Full payment date (if applicable)
  - Edit and Delete buttons

- **Search:** Real-time filtering by:
  - Farmer name
  - Contact number
  - Date

- **Edit Records:**
  - Inline form editing
  - Save changes back to cloud
  - Update animations

- **Delete Records:**
  - Confirmation dialog
  - Permanent removal
  - Cloud sync

#### UI Enhancements:
- Smooth collapse/expand animations
- Loading states
- Staggered card animations
- Empty state messaging

---

### 3. **Summary & Analytics**
**Purpose:** View statistics and trends

#### Period Filters:
- 🔵 **आज** (Today) - Records from current day
- 🟣 **सप्ताह** (Week) - Last 7 days
- 🟠 **महीना** (Month) - Last 30 days
- 🟢 **सभी** (All) - All-time records

#### Statistics Displayed:
1. **कुल रिकॉर्ड** (Total Records) - Count with icon
2. **कुल ज़मीन** (Total Land) - Acres + Dismil conversion
3. **कुल भुगतान** (Total Payment) - ₹ Amount in Rupees
4. **कुल बकाया** (Total Pending) - ₹ Pending Amount

#### Additional Stats (shown when data exists):
- 📊 **Average Land per Record** - (Total Land / Records)
- 💸 **Average Payment per Record** - (Total Payment / Records)
- 📈 **Average Rate per Acre** - (Total Payment / Total Land)

#### Animations:
- Counter animations (number incrementing)
- Smooth value transitions
- Color-coded stat cards (primary, secondary, success, warning)

---

### 4. **Settings**
**Purpose:** Customize app experience

#### Features:
- 🌙 **Dark/Light Mode Toggle**
  - Persisted in localStorage
  - System theme detection support
  - CSS variables for theme switching
  - Smooth transitions

---

### 5. **More Options**
**Purpose:** Additional utilities

#### Features:
- 📥 **Data Export** - Download records as CSV/Excel
- 📤 **Data Import** - Upload data from files
- ℹ️ **About App** - Version info (v1.0.0)

---

## 🔄 Data Flow & Cloud Integration

### Storage Hierarchy:
1. **localStorage** - Immediate storage for quick access
2. **Google Apps Script** - Cloud backup & sync
3. **Device ID** - Unique identifier per device

### Cloud Integration:
```
App (script.js) 
  ↓ HTTP Request
Server (server.js) - Proxy
  ↓ HTTPS Request
Google Apps Script
  ↓
Google Sheets (Backend)
```

### API Endpoints:
- **GET** `/api/cloud-data?deviceId=xxx` - Fetch records
- **POST** `/api/cloud-data` - Create new record
- **PUT** `/api/cloud-data` - Update record (via POST with _method=PUT)
- **DELETE** `/api/cloud-data` - Delete record (via POST with _method=DELETE)

### Record Structure:
```json
{
  "id": "timestamp_random",
  "deviceId": "device_xxxxx",
  "farmerName": "किसान का नाम",
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
```

---

## 🎨 UI/UX Features

### Navigation
- **Bottom Navigation Bar (Mobile-First)**
  - 5 floating nav items with icons
  - Active indicator with gradient animation
  - Smooth transitions
  - Responsive design

- **Top Header**
  - App title: "हार्वेस्टर ट्रैकर"
  - Current time display (updates every second)
  - Theme toggle (sun/moon icons)
  - Balance card showing total amount

### Design System
- **Color Scheme:**
  - Primary: Blue (#3f51b5)
  - Success: Green (#4caf50)
  - Warning: Orange (#ff9800)
  - Error: Red (#f44336)
  - Dark background: rgba(30, 30, 35, 0.95)

- **Typography:**
  - Font: "Noto Sans Devanagari" (Google Fonts)
  - Supports Hindi/Devanagari script natively

- **Components:**
  - Cards with shadows and smooth animations
  - Gradient backgrounds for active states
  - Floating action buttons
  - Smooth fade-in/fade-out transitions
  - Loading state indicators
  - Success/Error message notifications

### Animations
- **Entrance Animations:**
  - slideUp: Floating nav slides up on load
  - slideDown: Messages slide down
  - fadeIn: Content fades in

- **Interaction Animations:**
  - scaleIn: Background scales when active
  - slideInFromRight: Labels slide in when active
  - Hover effects on buttons
  - Counter animations for stats

- **Responsive Animations:**
  - Touch swipe support (80px min distance)
  - Keyboard navigation shortcuts

---

## 🔧 Technical Stack

### Frontend (Vanilla JS App)
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with variables
- **JavaScript (ES6+)** - Core functionality
- **Lucide Icons** - SVG icon library
- **localStorage API** - Local data storage

### Frontend (Angular App)
- **Angular 20.1.0** - Framework
- **TypeScript 5.8** - Language
- **Angular Material 20.1.0** - UI Components
- **RxJS 7.8** - Reactive programming
- **Angular Animations** - Built-in animations
- **Angular Forms** - Form handling

### Backend
- **Node.js** - Runtime
- **HTTP/HTTPS** - Protocols
- **No external dependencies** - Pure Node

### Cloud/External
- **Google Apps Script** - Backend database
- **Google Sheets** - Data persistence

---

## 🚀 Key Functionalities in Detail

### 1. **Form Submission & Validation**

```javascript
// Process:
1. User fills form
2. Input validation (client-side)
3. Calculation updates (real-time)
4. Submit button click
5. Save to localStorage
6. Sync to cloud (async)
7. Show success/error message
8. Reset form
```

**Validation Checks:**
- Land value > 0
- Rate value > 0
- Contact length = 10
- Pending ≤ Total
- Required fields filled

---

### 2. **Search & Filter**

```javascript
// Debounced search (300ms delay):
1. User types in search box
2. Filter records locally
3. Update UI with results
4. Show empty state if no matches
5. Display count of results
```

**Search Matches:**
- Farmer name (case-insensitive)
- Contact number (exact match)
- Date (partial match)

---

### 3. **Period-Based Analytics**

```javascript
// Date filtering logic:
- Today: Records from 00:00 to 23:59 current day
- Week: Last 7 × 24 hours
- Month: Last 30 × 24 hours
- All: All records in database
```

---

### 4. **Responsive Design**

```css
/* Breakpoints:
- Mobile: < 480px
- Tablet: 480px - 768px
- Desktop: > 768px

Adjustments:
- Bottom nav width
- Card layouts
- Font sizes
- Padding/margins
*/
```

---

## 🔐 Security & Data Integrity

### Local Security:
- Device ID stored in localStorage (unique per device)
- No sensitive data in plain text
- Input sanitization
- CORS headers on backend

### Data Sync:
- Conflict resolution (latest update wins)
- Cloud fallback if local fails
- Error handling with user feedback

### Accessibility:
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast modes

---

## 📊 Performance Optimizations

### Frontend:
- **Debouncing:** Search input (300ms)
- **Lazy Loading:** Images, icons
- **Event Delegation:** Button click handlers
- **Animation Optimization:** CSS transforms
- **Memory Management:** Cleanup listeners

### Backend:
- **Caching:** Static files (HTML, CSS, JS)
- **CORS:** Optimized headers
- **Error Handling:** Graceful fallbacks

---

## 🎓 Code Quality Features

### JavaScript Utilities:
```javascript
debounce(func, wait)           // Throttle function calls
parseDate(dateString)          // Date parsing helper
getFilteredRecordsByPeriod()   // Period-based filtering
animateCounterUpdate()         // Smooth number transitions
showMessage(msg, type)         // Toast notifications
```

### Keyboard Shortcuts:
- **Ctrl/Cmd + S** - Save form
- **Escape** - Clear search
- **Arrow Keys** - Tab navigation

### Touch Support:
- Swipe left/right to navigate tabs
- Minimum 80px swipe distance
- Mobile-optimized interactions

---

## 🌐 Browser Compatibility

- ✅ Chrome/Edge (Modern versions)
- ✅ Firefox (Latest)
- ✅ Safari (iOS 14+)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ⚠️ IE 11 - Not supported

---

## 📱 Mobile-First Design

The app is optimized for mobile-first with:
- Touch-friendly button sizes (48px minimum)
- Responsive typography
- Bottom navigation (easy thumb access)
- Swipe gestures
- Viewport optimization
- No hover-only interactions

---

## 🔄 State Management

### Using Signals (Angular):
```typescript
activeRoute = signal('/dashboard');
stats = signal<StatCard[]>([]);
title = signal('');
```

### Using localStorage:
```javascript
localStorage.getItem('deviceId')
localStorage.getItem('theme')
localStorage.getItem('records')
```

### Using Arrays:
```javascript
records[]          // All records from cloud
filteredRecords[]  // Search/filter results
selectedPeriod     // Current period filter
```

---

## 🚀 Angular Integration (ng-Harvester)

### Main Components:
1. **App Component** - Root component with floating nav
2. **Header Component** - Top navigation bar
3. **Add-New Component** - Entry form
4. **Dashboard Component** - Statistics display
5. **Records Component** - Record list & management
6. **Settings Component** - App preferences
7. **More Component** - Additional options

### Routes:
- `/dashboard` - Main dashboard
- `/add-new` - Add new entry
- `/records` - View records
- `/settings` - Settings page
- `/more` - More options

### Features Implemented:
- ✅ Floating navigation with SVG icons
- ✅ slideUp animation
- ✅ Material Design components
- ✅ Route guards
- ✅ Responsive layout

---

## 🔄 Recent Updates (Current Session)

1. **Floating Navigation Design**
   - Replaced mat-icon buttons with SVG icons
   - Dark theme with glass morphism (backdrop blur)
   - Blue gradient active background
   - Smooth animations (scale, slide, fade)
   - Custom SVG icons for each route

2. **Component Animation**
   - Added slideUp animation trigger
   - Smooth entrance effect

3. **Code Cleanup**
   - Removed unused Material Button/Icon imports
   - Optimized component structure

---

## 📝 Data Entry Example

```
Input:
- Name: राज शर्मा (Raj Sharma)
- Contact: 9876543210
- Date: 30-12-2025
- Land: 5.5 acres
- Rate: ₹2500/acre

Calculated Output:
- Total: ₹13,750
- Paid: ₹10,000 (if entered)
- Pending: ₹3,750
```

---

## 🎯 Unique Features

1. **Bilingual Support** - Hindi + English interface
2. **Real-Time Calculations** - Auto-update totals
3. **Cloud Sync** - Automatic data backup
4. **Device ID Tracking** - Multi-device support
5. **Payment Tracking** - Split payment support
6. **Period-Based Analytics** - Flexible date filtering
7. **Dark Mode** - Eye-friendly theme
8. **Offline Support** - Works without internet
9. **Touch Optimized** - Mobile gestures
10. **Accessible** - WCAG standards

---

## 🐛 Known Limitations & TODOs

- Angular app components need service integration
- No backend database yet (depends on Google Apps Script)
- No user authentication (device ID only)
- No data export/import yet (UI ready)
- Limited to local storage when offline
- No offline sync queue

---

## 📞 API Documentation

### GET Records
```
GET /api/cloud-data?deviceId=device_xxxxx
Returns: { success: true, data: [...records] }
```

### Create Record
```
POST /api/cloud-data
Body: { record object }
Returns: { success: true, id: 'new_id' }
```

### Update Record
```
PUT /api/cloud-data
Body: { id: 'xxx', ...updatedFields }
Returns: { success: true }
```

### Delete Record
```
DELETE /api/cloud-data
Body: { id: 'xxx' }
Returns: { success: true }
```

---

## 🎓 Code Examples

### Loading Records:
```javascript
async function loadRecordsFromCloud() {
  const response = await fetch(SCRIPT_URL + '?deviceId=' + deviceId);
  const data = await response.json();
  records = data.records || [];
  displayRecords();
}
```

### Creating Record:
```javascript
async function saveRecords(formData) {
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  return await response.json();
}
```

### Filtering by Period:
```javascript
function getFilteredRecordsByPeriod(period) {
  const now = new Date();
  return records.filter(record => {
    const recordDate = new Date(record.date);
    if (period === 'today') return isSameDay(recordDate, now);
    if (period === 'week') return isWithinWeek(recordDate, now);
    if (period === 'month') return isWithinMonth(recordDate, now);
    return true;
  });
}
```

---

## 🏁 Summary

**Harvester 3.0** is a comprehensive, bilingual (Hindi/English) web application for tracking harvester cutting operations and farmer payments. It features:

- ✅ Complete entry and record management
- ✅ Real-time calculations and analytics
- ✅ Cloud synchronization capability
- ✅ Modern, responsive UI with animations
- ✅ Mobile-first design
- ✅ Offline support with localStorage
- ✅ Dark/Light theme switching
- ✅ Accessibility features
- ✅ Both vanilla JS and Angular implementations

The app is production-ready for the vanilla implementation and under development for the Angular modernization.

---

**Last Updated:** December 30, 2025  
**Version:** 3.0  
**Status:** Active Development
