# 🚀 Quick Setup & User Guide

## Harvester Tracker - Angular 20 Bottom Navigation App

Your complete guide to get started with this modern Angular application featuring smooth bottom navigation with Material Design.

---

## 📋 What You Have

✅ **5 Navigation Pages** with smooth animations
- Add New (Form with date picker)
- Records (Table with search)
- Dashboard (Statistics cards)
- Settings (Preferences)
- More (Additional options)

✅ **Reusable Header Component**
✅ **Route Guards** for protection
✅ **Material Design** theme
✅ **Responsive** design
✅ **Clean 3-file structure** (HTML, SCSS, TS)

---

## ⚡ Quick Start (3 Steps)

### Step 1: Install Dependencies
Open terminal in the `ng-Harvester` folder:

```bash
npm install
```

Wait for installation to complete (~2-3 minutes)

### Step 2: Start the Server
```bash
npm start
```

Wait for compilation, then open: **http://localhost:4200**

### Step 3: Enable Full Access (Optional)
Open browser DevTools Console (F12) and run:

```javascript
localStorage.setItem('isAuthenticated', 'true');
```

Now refresh the page - all routes are accessible!

---

## 🎨 Navigation Showcase

Your bottom navigation has **5 beautiful sections**:

```
┌─────────────────────────────────────────────┐
│           HEADER (Fixed Top)                 │
│   🏠 हार्वेस्टर ट्रैकर   🔔  👤          │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│                                             │
│          MAIN CONTENT AREA                  │
│        (Smooth Transitions)                 │
│                                             │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│       BOTTOM NAVIGATION (Fixed)             │
│  ➕      📋      🏠      ⚙️      ⋯        │
│ Add   Records Dashboard Settings More      │
└─────────────────────────────────────────────┘
```

### Active State Features:
- **Blue bar** slides down from top
- **Icon scales up** (1.1x)
- **Background tint** (light blue)
- **Smooth animations** (0.3s cubic-bezier)

---

## 📱 Component Features

### 1. 🏠 Dashboard (Default)
**Route**: `/dashboard`

Features:
- 4 statistic cards with icons and colors
- Total Records, Total Amount, This Month, Pending
- Chart placeholder
- Quick action buttons

**Try**: Navigate here first - it's the default page!

### 2. ➕ Add New
**Route**: `/add-new`

Features:
- Title input field
- Description textarea
- Amount input (with rupee icon)
- Date picker (Material Datepicker)
- Save & Cancel buttons

**Try**: Fill the form and click Save (check console for output)

### 3. 📋 Records
**Route**: `/records`

Features:
- Search bar at top
- Material Table with 5 columns
- Edit & Delete buttons
- Sample data loaded

**Try**: Click edit/delete buttons (check console)

### 4. ⚙️ Settings
**Route**: `/settings`

Features:
- Notification toggle
- Dark mode toggle
- Language selector (हिंदी/English)
- Profile, Privacy, Security links
- Logout button

**Try**: Toggle switches and see console logs

### 5. ⋯ More
**Route**: `/more`

Features:
- User profile card
- 8 menu items (Help, About, Terms, etc.)
- Version display (1.0.0)
- Chevron indicators

**Try**: Click menu items (check console)

---

## 🎯 How the Navigation Works

### Liquid Animation Effect
Your navigation has the **same smooth effect** as shown in your reference image:

1. **Click any nav item**
2. **Blue bar** appears at top (slides down)
3. **Icon scales up** and turns blue
4. **Label** becomes bold and blue
5. **Background** gets light tint
6. **Content** fades in smoothly

### Animation Technical Details:
```scss
// From app.scss
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

- **Duration**: 300ms
- **Easing**: Material Design standard
- **Properties**: transform, color, background

---

## 🛠️ Development Commands

```bash
# Start dev server
npm start                    # Port 4200

# Build for production
npm run build               # Output to dist/

# Build with watch mode
npm run watch              # Auto-rebuild on changes

# Run tests (when configured)
npm test
```

---

## 🔒 Route Guard Explained

All routes use `authGuard` from `/src/app/core/guards/auth.guard.ts`

**Current Behavior**:
- Checks `localStorage.getItem('isAuthenticated')`
- **Development**: Allows access by default
- **Production**: Redirect to login (when you implement it)

**To Require Auth in Dev**:
Change line 13 in `auth.guard.ts`:
```typescript
return true; // Change to: return isAuthenticated;
```

---

## 🎨 Customization Guide

### Change Theme Colors

Edit `src/styles.scss`:

```scss
// Line 5-7
$my-primary: mat.m2-define-palette(mat.$m2-blue-palette);
$my-accent: mat.m2-define-palette(mat.$m2-amber-palette);
$my-warn: mat.m2-define-palette(mat.$m2-red-palette);
```

Available palettes: `indigo`, `pink`, `blue`, `green`, `amber`, `purple`, etc.

### Add New Navigation Item

Edit `src/app/app.ts`:

```typescript
protected readonly navItems: NavItem[] = [
  // Add your new item:
  { label: 'Profile', icon: 'person', route: '/profile' },
  // ...existing items
];
```

Then create the component and add route!

### Modify Header Title

Edit `src/app/app.ts`:

```typescript
protected readonly title = signal('Your New Title');
```

Or pass different title to header in `app.html`:

```html
<app-header [title]="'Custom Title'" />
```

---

## 📐 Project Structure

```
ng-Harvester/
├── src/app/
│   ├── core/guards/           # Route protection
│   ├── features/              # 5 main pages
│   │   ├── add-new/
│   │   ├── records/
│   │   ├── dashboard/
│   │   ├── settings/
│   │   └── more/
│   ├── shared/components/     # Reusable header
│   ├── app.ts                 # Root component
│   ├── app.html               # Bottom nav layout
│   ├── app.scss               # Navigation styles
│   ├── app.routes.ts          # All routes
│   └── app.config.ts          # Providers
├── src/styles.scss            # Material theme
└── package.json               # Dependencies
```

---

## 🎓 Learning Points

### Angular 20 Features Used:
1. **Standalone Components** - No modules!
2. **Signals** - `signal()` for reactive state
3. **Control Flow** - `@for`, `@if` in templates
4. **Zoneless** - Better performance
5. **Input Signals** - `input<string>()`

### Material Design:
1. **Theming** - Custom color scheme
2. **Components** - 12+ Material components
3. **Elevation** - Shadows and depth
4. **Typography** - Roboto font family

---

## 💡 Pro Tips

1. **Inspect Navigation**: Open DevTools and click nav items to see animations
2. **Console Logs**: All buttons log to console - open F12 to see
3. **Responsive**: Resize browser to see mobile/tablet/desktop views
4. **Material Icons**: Browse at https://fonts.google.com/icons
5. **Signals**: Use `.set()`, `.update()`, and `()` to access

---

## 🐛 Common Issues & Solutions

### Issue: "npm install" fails
**Solution**:
```bash
node --version  # Check Node.js >=18
npm cache clean --force
npm install
```

### Issue: Port 4200 already in use
**Solution**:
```bash
ng serve --port 4300
```

### Issue: Material styles not applied
**Solution**: Clear browser cache (Ctrl+Shift+Del)

### Issue: Routes not working
**Solution**: Check browser console for errors

---

## 🎯 Next Steps

1. **Add Backend**: Connect to API for real data
2. **Implement Auth**: Real login/logout system
3. **Add Charts**: Use Chart.js or ngx-charts
4. **Dark Theme**: Implement dark mode toggle
5. **PWA**: Make it a Progressive Web App
6. **Localization**: Full i18n support

---

## 📚 Resources

- [Angular Docs](https://angular.io/docs)
- [Material Design](https://material.angular.io/)
- [Material Icons](https://fonts.google.com/icons)
- [Angular Signals](https://angular.io/guide/signals)

---

## ✅ Checklist

Before deploying:

- [ ] Update `package.json` name and version
- [ ] Replace favicon in `/public`
- [ ] Implement real authentication
- [ ] Add error handling
- [ ] Configure production environment
- [ ] Test on multiple devices
- [ ] Optimize bundle size
- [ ] Set up CI/CD

---

<div align="center">

## 🎉 You're All Set!

Start the server and enjoy your **smooth bottom navigation app**!

```bash
npm start
```

**Built with Angular 20 + Material Design**

</div>
