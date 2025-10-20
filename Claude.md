# 🤖 Claude.md - AI Assistant Guide

**Guide for Claude, GPT-4, and other AI coding assistants working on the YoyoPod Dashboard**

This document provides essential context and guidelines for AI assistants to effectively understand, modify, and extend the YoyoPod Dashboard codebase.

---

## 📋 Table of Contents

- [Project Context](#project-context)
- [Architecture Overview](#architecture-overview)
- [Key Design Patterns](#key-design-patterns)
- [Common Modification Requests](#common-modification-requests)
- [Adding New Features](#adding-new-features)
- [Integration Points](#integration-points)
- [Testing New Changes](#testing-new-changes)
- [Code Consistency Guidelines](#code-consistency-guidelines)
- [Performance Considerations](#performance-considerations)
- [Security Requirements](#security-requirements)
- [Deployment Checklist](#deployment-checklist)
- [Common Pitfalls](#common-pitfalls)
- [Quick Reference](#quick-reference)

---

## 🎯 Project Context

### What is YoyoPod?

YoyoPod is a **screen-free audio streaming device for children** (ages 6-12) built on Raspberry Pi Zero 2 W. This dashboard is the **parent management interface** that runs locally on the device, accessible via mobile browser.

### Critical Constraints

1. **Runs on Pi Zero 2 W**: Limited resources (512MB RAM, 1GHz quad-core CPU)
2. **Local-only**: No cloud dependencies, all data on-device
3. **Mobile-first**: Parents access via phone, rarely desktop
4. **Offline-capable**: Must work without internet after setup
5. **Privacy-focused**: GDPR/COPPA compliant by design
6. **Three variants**: Core, Call (+ VoIP/GPS), AI (+ OpenAI assistant)

### User Personas

**Primary User: Parent (non-technical)**
- Uses phone to configure device
- Wants quick, intuitive controls
- Concerned about child safety
- Limited time (quick interactions)

**Secondary User: Developer (integration)**
- Works on Pi backend services
- Needs clear API contracts
- Expects comprehensive error handling

---

## 🏗️ Architecture Overview

### Tech Stack Philosophy

**Why Remix (not separate REST API)?**
- Full-stack framework reduces complexity
- Server-side rendering = faster initial load on Pi
- Built-in form handling with progressive enhancement
- Smaller bundle size vs. separate client/server

**Why SQLite (not PostgreSQL)?**
- ~10MB RAM vs ~200MB for Postgres
- No separate daemon to manage
- Perfect for single-user, local data
- Prisma makes it feel like a full DB

**Why Cookie Sessions (not JWT)?**
- Simpler for local-only access
- Server can invalidate instantly
- No token refresh complexity
- Secure httpOnly cookies

### Request Flow

```
Mobile Phone Browser
        ↓
    [HTTPS/SSL]
        ↓
Remix Server (Node.js/Bun on Pi)
        ↓
    ┌────────┴────────┐
    ↓                 ↓
SQLite DB      Pi Services (HTTP)
(local state)  (WiFi, GPS, VoIP, etc.)
```

### Folder Structure Logic

```
app/
├── routes/                    # File-based routing (Remix convention)
│   ├── _index.tsx            # Route: / (login page)
│   ├── _auth.tsx             # Layout wrapper for authenticated pages
│   ├── _auth.dashboard.tsx   # Route: /dashboard
│   └── api.*.ts              # Route: /api/* (API endpoints)
│
├── components/
│   ├── ui/                   # Base components (shadcn/ui)
│   └── [feature]/            # Feature-specific components
│
├── lib/                      # Server-side only code
│   └── *.server.ts           # Never sent to client
│
└── services/                 # External service integrations
    └── *.service.ts          # HTTP clients for Pi services
```

---

## 🔑 Key Design Patterns

### 1. Remix Loader/Action Pattern

```typescript
// Every route follows this pattern:

// SERVER-SIDE: Load data
export async function loader({ request }: LoaderFunctionArgs) {
  // 1. Authenticate user
  const userId = await requireAuth(request);
  
  // 2. Fetch data from DB or services
  const data = await fetchData(userId);
  
  // 3. Return JSON (auto-serialized)
  return json(data);
}

// SERVER-SIDE: Handle form submissions
export async function action({ request }: ActionFunctionArgs) {
  // 1. Authenticate
  const userId = await requireAuth(request);
  
  // 2. Validate input
  const formData = await request.formData();
  const validated = schema.parse(Object.fromEntries(formData));
  
  // 3. Process & save
  await saveData(validated);
  
  // 4. Return response
  return json({ success: true });
}

// CLIENT-SIDE: React component
export default function RouteName() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  
  return (
    <Form method="post">
      {/* Form fields */}
    </Form>
  );
}
```

### 2. Service Integration Pattern

```typescript
// services/wifi.service.ts
export class WiFiService {
  private client = new DeviceServiceClient();
  
  async scan(): Promise<WiFiNetwork[]> {
    try {
      return await this.client.get<WiFiNetwork[]>('/wifi/scan');
    } catch (error) {
      logger.error('WiFi scan failed', error);
      // Return empty array, not throw (graceful degradation)
      return [];
    }
  }
}

// In route loader:
export async function loader() {
  const wifiService = new WiFiService();
  const networks = await wifiService.scan();
  return json({ networks });
}
```

### 3. Variant-Aware Components

```typescript
// components/layout/Navigation.tsx
import { useDeviceVariant } from '~/hooks/useDeviceVariant';

export function Navigation() {
  const variant = useDeviceVariant(); // 'core' | 'call' | 'ai'
  
  return (
    <nav>
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/content">Content</NavLink>
      
      {/* Show only if Call or AI variant */}
      {(variant === 'call' || variant === 'ai') && (
        <NavLink to="/contacts">Contacts</NavLink>
      )}
      
      {/* Show only if AI variant */}
      {variant === 'ai' && (
        <NavLink to="/ai">AI Settings</NavLink>
      )}
    </nav>
  );
}
```

### 4. Form Validation Pattern

```typescript
// lib/validation.ts
import { z } from 'zod';

export const wifiConnectSchema = z.object({
  ssid: z.string().min(1, 'Network name required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  autoConnect: z.boolean().default(true)
});

// In route action:
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const rawData = Object.fromEntries(formData);
  
  // Validate (throws if invalid)
  const validated = wifiConnectSchema.parse(rawData);
  
  // Now use validated data
  await wifiService.connect(validated);
  
  return json({ success: true });
}
```

### 5. Error Handling Pattern

```typescript
// Every action/loader should handle errors gracefully

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const data = await fetchData();
    return json({ data, error: null });
  } catch (error) {
    logger.error('Loader failed', error);
    return json(
      { data: null, error: 'Failed to load data' },
      { status: 500 }
    );
  }
}

// Component handles both success and error states
export default function Component() {
  const { data, error } = useLoaderData<typeof loader>();
  
  if (error) return <ErrorAlert message={error} />;
  if (!data) return <LoadingSpinner />;
  
  return <DataDisplay data={data} />;
}
```

---

## 🔧 Common Modification Requests

### 1. Adding a New Setting

**Request**: "Add a setting to limit daily podcast listening time"

**Steps**:

1. **Update Prisma Schema**
```prisma
// prisma/schema.prisma
model Settings {
  // ... existing fields
  podcastDailyLimit Int? // minutes, null = unlimited
}
```

2. **Run Migration**
```bash
pnpm prisma migrate dev --name add_podcast_limit
```

3. **Update Settings Route**
```typescript
// app/routes/_auth.settings.tsx

// Add to validation schema
const settingsSchema = z.object({
  // ... existing fields
  podcastDailyLimit: z.coerce.number().min(0).max(1440).nullable()
});

// Add to form
<FormField>
  <Label>Daily Podcast Limit (minutes)</Label>
  <Input 
    type="number" 
    name="podcastDailyLimit"
    defaultValue={settings.podcastDailyLimit ?? ''}
    placeholder="Unlimited"
  />
  <FormDescription>
    0 = no podcasts allowed, empty = unlimited
  </FormDescription>
</FormField>
```

4. **Update Backend Logic** (if needed)
```typescript
// services/content.service.ts
export async function checkPodcastLimit(userId: string): Promise<boolean> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings?.podcastDailyLimit) return true;
  
  const todayUsage = await getPodcastUsageToday(userId);
  return todayUsage < settings.podcastDailyLimit;
}
```

### 2. Adding a New Page

**Request**: "Add a 'Device Health' page showing temperature, battery health, etc."

**Steps**:

1. **Create Route File**
```bash
touch app/routes/_auth.health.tsx
```

2. **Implement Route**
```typescript
// app/routes/_auth.health.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/lib/auth.server';
import { DeviceService } from '~/services/device.service';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  
  const deviceService = new DeviceService();
  const health = await deviceService.getHealthMetrics();
  
  return json({ health });
}

export default function HealthPage() {
  const { health } = useLoaderData<typeof loader>();
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Device Health</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <HealthCard
          title="Battery"
          value={`${health.battery.percentage}%`}
          status={health.battery.health}
          icon="battery"
        />
        
        <HealthCard
          title="Temperature"
          value={`${health.temperature}°C`}
          status={health.temperature > 60 ? 'warning' : 'good'}
          icon="thermometer"
        />
        
        {/* More cards */}
      </div>
    </div>
  );
}
```

3. **Add Navigation Link**
```typescript
// components/layout/Navigation.tsx
<NavLink to="/health">Device Health</NavLink>
```

4. **Create Service Integration**
```typescript
// services/device.service.ts
export class DeviceService {
  private client = new DeviceServiceClient();
  
  async getHealthMetrics() {
    return await this.client.get('/device/health');
  }
}
```

### 3. Adding a Pi Service Integration

**Request**: "Integrate with new music equalizer service"

**Steps**:

1. **Create Service Client**
```typescript
// services/equalizer.service.ts
export interface EqualizerSettings {
  bass: number;      // -12 to +12 dB
  treble: number;    // -12 to +12 dB
  preset: 'flat' | 'pop' | 'rock' | 'classical';
}

export class EqualizerService {
  private client = new DeviceServiceClient();
  
  async getSettings(): Promise<EqualizerSettings> {
    return await this.client.get('/audio/equalizer');
  }
  
  async updateSettings(settings: EqualizerSettings): Promise<void> {
    await this.client.post('/audio/equalizer', settings);
  }
}
```

2. **Add to Settings Route**
```typescript
// app/routes/_auth.settings.tsx

// In loader:
const eqService = new EqualizerService();
const eqSettings = await eqService.getSettings();

// In action:
if (formData.get('_action') === 'updateEqualizer') {
  const eqSettings = equalizerSchema.parse(formData);
  await eqService.updateSettings(eqSettings);
}

// In component:
<Form method="post">
  <input type="hidden" name="_action" value="updateEqualizer" />
  
  <Label>Bass</Label>
  <Slider
    name="bass"
    min={-12}
    max={12}
    defaultValue={eqSettings.bass}
  />
  
  {/* More controls */}
  
  <Button type="submit">Save Equalizer</Button>
</Form>
```

3. **Update Integration Config**
```json
// config/integration-endpoints.json
{
  "endpoints": {
    "audio": {
      "equalizer": "/audio/equalizer",
      "volume": "/audio/volume"
    }
  }
}
```

---

## 🆕 Adding New Features

### Feature Checklist

When adding a new feature, ensure you:

- [ ] **Database Changes**
  - Update Prisma schema if storing data
  - Create migration: `pnpm prisma migrate dev --name feature_name`
  - Update seed data if needed

- [ ] **Backend Logic**
  - Create/update service classes
  - Implement loader/action in route
  - Add Zod validation schemas
  - Handle errors gracefully

- [ ] **Frontend Components**
  - Create UI components
  - Ensure mobile-responsive (test at 320px width)
  - Add loading states
  - Add error states
  - Add empty states

- [ ] **Variant Awareness**
  - Check if feature applies to all variants
  - Add variant checks in navigation/UI
  - Update device-variant.json

- [ ] **Testing**
  - Write unit tests for logic
  - Write integration tests for API
  - Write E2E test for critical flows
  - Test on actual Pi Zero 2 W

- [ ] **Documentation**
  - Update README if user-facing
  - Update API.md if adding endpoints
  - Update INTEGRATION.md if affecting Pi services
  - Add JSDoc comments to functions

- [ ] **Security**
  - Validate all inputs
  - Check authentication/authorization
  - Log sensitive actions
  - Consider rate limiting

- [ ] **Performance**
  - Profile on Pi Zero 2 W
  - Optimize database queries
  - Consider pagination for lists
  - Lazy load heavy components

---

## 🔌 Integration Points

### Pi Services Communication

**Important**: The dashboard does NOT implement device features directly. It only provides a UI to configure Pi services that run separately.

```
┌──────────────────┐       ┌──────────────────┐
│  Dashboard       │──GET──│  Pi Services     │
│  (This Repo)     │       │  (Separate Repo) │
│                  │←─JSON─│                  │
│  - Shows UI      │       │  - Controls HW   │
│  - Saves prefs   │       │  - Plays audio   │
│  - Validates     │──POST─│  - Manages calls │
└──────────────────┘       └──────────────────┘
```

### Service Contract Example

```typescript
// This is what Pi services MUST implement:

// GET /api/wifi/scan
Response: {
  networks: [
    {
      ssid: "Home WiFi",
      signal: 85,
      security: "wpa2",
      frequency: "2.4GHz"
    }
  ]
}

// POST /api/wifi/connect
Body: {
  ssid: "Home WiFi",
  password: "secret123"
}
Response: {
  success: true,
  ip: "192.168.1.42"
}
```

### Integration Testing Without Pi Services

```typescript
// tests/integration/wifi.test.ts

// Mock the service
vi.mock('~/services/wifi.service', () => ({
  WiFiService: class {
    async scan() {
      return [
        { ssid: 'Test Network', signal: 75, security: 'wpa2', frequency: '2.4GHz' }
      ];
    }
  }
}));

describe('WiFi Route', () => {
  it('displays scanned networks', async () => {
    const response = await request(app).get('/wifi');
    expect(response.body.networks).toHaveLength(1);
  });
});
```

---

## 🧪 Testing New Changes

### Test Hierarchy

```
1. Unit Tests (Fast, Isolated)
   ↓
2. Integration Tests (Database, Routes)
   ↓
3. E2E Tests (Full User Flows)
   ↓
4. Manual Testing (Real Pi Hardware)
```

### Writing Tests

**Unit Test Example**:
```typescript
// tests/unit/auth.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassword } from '~/lib/auth.server';

describe('validatePassword', () => {
  it('rejects weak passwords', () => {
    expect(validatePassword('weak')).toBe(false);
    expect(validatePassword('12345678')).toBe(false);
  });
  
  it('accepts strong passwords', () => {
    expect(validatePassword('StrongPass123')).toBe(true);
  });
});
```

**Integration Test Example**:
```typescript
// tests/integration/settings.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '~/lib/db.server';
import { createTestUser } from '../helpers';

describe('Settings API', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });
  
  it('updates settings successfully', async () => {
    const user = await createTestUser();
    
    await request(app)
      .post('/settings')
      .send({ maxVolume: 75 })
      .set('Cookie', user.sessionCookie);
      
    const settings = await prisma.settings.findUnique({
      where: { userId: user.id }
    });
    
    expect(settings?.maxVolume).toBe(75);
  });
});
```

**E2E Test Example**:
```typescript
// tests/e2e/wifi-setup.spec.ts
import { test, expect } from '@playwright/test';

test('WiFi configuration flow', async ({ page }) => {
  // Login
  await page.goto('/');
  await page.fill('[name="username"]', 'parent');
  await page.fill('[name="password"]', 'Password123');
  await page.click('[type="submit"]');
  
  // Navigate to WiFi
  await page.click('text=WiFi Settings');
  
  // Scan networks
  await page.click('text=Scan Networks');
  await page.waitForSelector('[data-testid="network-list"]');
  
  // Select network
  await page.click('text=Test Network');
  await page.fill('[name="password"]', 'network-pass');
  await page.click('text=Connect');
  
  // Verify success
  await expect(page.locator('text=Connected successfully')).toBeVisible();
});
```

### Testing on Pi

```bash
# 1. Deploy to test Pi
./scripts/deploy-to-pi.sh 192.168.1.100

# 2. SSH into Pi
ssh pi@192.168.1.100

# 3. Check resource usage
htop

# 4. Check logs
pm2 logs yoyopod-dashboard

# 5. Run health check
curl https://localhost:3000/api/health

# 6. Test from phone
# Open mobile browser: https://192.168.1.100:3000
```

---

## 📐 Code Consistency Guidelines

### Naming Conventions

```typescript
// Components: PascalCase
export function WiFiScanner() { }

// Functions: camelCase
export async function scanNetworks() { }

// Constants: UPPER_SNAKE_CASE
export const MAX_VOLUME = 80;

// Types/Interfaces: PascalCase
export interface WiFiNetwork { }

// Files: kebab-case
// wifi-scanner.tsx
// network-utils.ts
```

### Component Structure

```typescript
// Standard component template

import { type ComponentProps } from 'react';
import { cn } from '~/lib/utils';

interface ComponentNameProps extends ComponentProps<'div'> {
  // Custom props
  variant?: 'default' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

export function ComponentName({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: ComponentNameProps) {
  return (
    <div
      className={cn(
        'base-classes',
        variant === 'outlined' && 'border-2',
        size === 'lg' && 'text-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

### Error Handling Style

```typescript
// Prefer explicit error handling over try-catch everywhere

export async function fetchData(): Promise<Result<Data>> {
  try {
    const data = await apiCall();
    return { success: true, data };
  } catch (error) {
    logger.error('fetchData failed', error);
    return { success: false, error: 'Failed to fetch data' };
  }
}

// Usage:
const result = await fetchData();
if (!result.success) {
  return json({ error: result.error }, { status: 500 });
}
// Use result.data safely
```

### Imports Order

```typescript
// 1. External libraries
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

// 2. Internal modules (absolute imports)
import { requireAuth } from '~/lib/auth.server';
import { Button } from '~/components/ui/button';

// 3. Types
import type { LoaderFunctionArgs } from '@remix-run/node';

// 4. Relative imports (if any)
import { helper } from './utils';
```

---

## ⚡ Performance Considerations

### Pi Zero 2 W Constraints

```
CPU: 1GHz quad-core (ARM Cortex-A53)
RAM: 512MB (shared with system)
Storage: MicroSD (slow random I/O)

Budget for Dashboard:
- Memory: Max 80MB
- CPU: Max 10% average
- Storage: Max 500MB total
```

### Optimization Strategies

**1. Lazy Loading**
```typescript
// Don't load everything upfront
import { lazy } from 'react';

const LocationMap = lazy(() => import('~/components/location/Map'));

// Use Suspense
<Suspense fallback={<MapSkeleton />}>
  <LocationMap />
</Suspense>
```

**2. Database Optimization**
```typescript
// Add indexes to Prisma schema
model CallHistory {
  id        String   @id
  timestamp DateTime
  
  @@index([timestamp]) // Fast time-based queries
}

// Use select to fetch only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { username: true, settings: true } // Not all fields
});
```

**3. Pagination**
```typescript
// Don't load 1000 location history records at once
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = 50;
  
  const locations = await prisma.location.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { timestamp: 'desc' }
  });
  
  return json({ locations, page });
}
```

**4. Caching**
```typescript
// Cache device status (doesn't change every second)
let cachedStatus: DeviceStatus | null = null;
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function getDeviceStatus() {
  const now = Date.now();
  if (cachedStatus && (now - cacheTime) < CACHE_TTL) {
    return cachedStatus;
  }
  
  cachedStatus = await fetchDeviceStatus();
  cacheTime = now;
  return cachedStatus;
}
```

**5. Avoid Heavy Dependencies**
```typescript
// ❌ Don't add moment.js (60KB)
import moment from 'moment';

// ✅ Use native Date or date-fns (tree-shakeable)
import { format } from 'date-fns';
```

---

## 🔒 Security Requirements

### Authentication Checklist

Every protected route must:

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  // ALWAYS authenticate first
  const userId = await requireAuth(request);
  
  // Then fetch data
  const data = await fetchData(userId);
  
  return json(data);
}
```

### Input Validation

```typescript
// ALWAYS validate with Zod before processing
const schema = z.object({
  ssid: z.string().min(1).max(32),
  password: z.string().min(8).max(63)
});

// This throws if invalid (caught by error boundary)
const validated = schema.parse(formData);

// Now safe to use
await connect(validated.ssid, validated.password);
```

### Password Handling

```typescript
import bcrypt from 'bcryptjs';

// Hashing
const hashed = await bcrypt.hash(password, 10); // 10 rounds

// Verification
const valid = await bcrypt.compare(password, hashed);

// NEVER store plain text passwords
// NEVER log passwords
// NEVER send passwords in URLs
```

### Session Security

```typescript
// Session cookie configuration
export const sessionCookie = createCookie('__session', {
  httpOnly: true,      // Not accessible via JS
  secure: true,        // HTTPS only
  sameSite: 'lax',     // CSRF protection
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
});
```

### Audit Logging

```typescript
// Log all sensitive actions
await prisma.auditLog.create({
  data: {
    userId,
    action: 'settings_changed',
    details: JSON.stringify({ changed: ['maxVolume'] }),
    ipAddress: request.headers.get('x-forwarded-for'),
    createdAt: new Date()
  }
});
```

---

## 🚀 Deployment Checklist

Before deploying changes:

- [ ] **Code Quality**
  - Run linter: `pnpm lint`
  - Fix all TypeScript errors: `pnpm typecheck`
  - Format code: `pnpm format`

- [ ] **Testing**
  - All unit tests pass: `pnpm test`
  - Integration tests pass: `pnpm test:integration`
  - E2E tests pass: `pnpm test:e2e`
  - Manual testing on Pi hardware

- [ ] **Database**
  - Migrations created: `pnpm prisma migrate dev`
  - Seed data updated if needed
  - Backup current database before deploy

- [ ] **Performance**
  - Profile on Pi Zero 2 W
  - Memory usage < 80MB
  - Page load time < 3 seconds
  - No memory leaks (run for 1 hour)

- [ ] **Security**
  - Input validation on all forms
  - Authentication on protected routes
  - Audit logging for sensitive actions
  - No console.log in production code

- [ ] **Documentation**
  - Update README if user-facing changes
  - Update API.md if endpoints changed
  - Update INTEGRATION.md if contracts changed
  - Add JSDoc to new functions

- [ ] **Build & Deploy**
  ```bash
  # Build
  pnpm build
  
  # Test build locally
  pnpm start
  
  # Deploy to Pi
  ./scripts/deploy-to-pi.sh [pi-ip]
  
  # Verify health
  curl https://[pi-ip]:3000/api/health
  
  # Monitor logs
  ssh pi@[pi-ip]
  pm2 logs yoyopod-dashboard
  ```

---

## ⚠️ Common Pitfalls

### 1. Forgetting Variant Checks

```typescript
// ❌ Wrong - shows contacts link for Core variant
<NavLink to="/contacts">Contacts</NavLink>

// ✅ Correct - check variant first
{(variant === 'call' || variant === 'ai') && (
  <NavLink to="/contacts">Contacts</NavLink>
)}
```

### 2. Not Handling Service Failures

```typescript
// ❌ Wrong - crashes if service is down
export async function loader() {
  const status = await deviceService.getStatus(); // throws
  return json({ status });
}

// ✅ Correct - graceful degradation
export async function loader() {
  try {
    const status = await deviceService.getStatus();
    return json({ status, error: null });
  } catch (error) {
    logger.error('Device service unavailable', error);
    return json({ 
      status: null, 
      error: 'Device temporarily unavailable' 
    });
  }
}
```

### 3. Inefficient Database Queries

```typescript
// ❌ Wrong - N+1 query problem
const contacts = await prisma.contact.findMany();
for (const contact of contacts) {
  const calls = await prisma.callHistory.findMany({
    where: { contactId: contact.id }
  }); // Separate query for each contact!
}

// ✅ Correct - single query with include
const contacts = await prisma.contact.findMany({
  include: {
    callHistory: true
  }
});
```

### 4. Large Bundles

```typescript
// ❌ Wrong - imports entire library
import _ from 'lodash';

// ✅ Correct - import specific function
import { debounce } from 'lodash-es';

// Even better - use native JS
const debounced = setTimeout(() => { }, 300);
```

### 5. Not Testing on Real Hardware

```
❌ "Works on my laptop" ≠ "Works on Pi Zero 2 W"

✅ Always test on actual Pi before declaring done
```

### 6. Forgetting Mobile View

```typescript
// ❌ Wrong - desktop-only layout
<div className="flex">
  <Sidebar className="w-64" />
  <Main className="flex-1" />
</div>

// ✅ Correct - mobile-first responsive
<div className="flex flex-col md:flex-row">
  <Sidebar className="w-full md:w-64" />
  <Main className="flex-1" />
</div>
```

---

## 📚 Quick Reference

### Useful Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm prisma studio    # Open DB GUI
pnpm prisma migrate dev --name migration_name
pnpm prisma generate  # Regenerate client

# Testing
pnpm test             # Unit tests
pnpm test:watch       # Watch mode
pnpm test:e2e         # E2E tests
pnpm test:coverage    # Coverage report

# Code Quality
pnpm lint             # Lint code
pnpm lint:fix         # Auto-fix issues
pnpm typecheck        # Check types
pnpm format           # Format code

# Production
pm2 start ecosystem.config.js
pm2 logs              # View logs
pm2 restart all       # Restart
pm2 monit             # Monitor resources
```

### File Templates

**New Route**:
```typescript
// app/routes/_auth.feature.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/lib/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuth(request);
  // Fetch data
  return json({ data });
}

export default function FeaturePage() {
  const { data } = useLoaderData<typeof loader>();
  return <div>Content</div>;
}
```

**New Service**:
```typescript
// services/feature.service.ts
import { DeviceServiceClient } from './base.service';

export class FeatureService {
  private client = new DeviceServiceClient();
  
  async getData() {
    return await this.client.get('/feature/data');
  }
}
```

**New Component**:
```typescript
// components/feature/Component.tsx
interface ComponentProps {
  data: string;
}

export function Component({ data }: ComponentProps) {
  return <div>{data}</div>;
}
```

### Common Patterns

**Form with Validation**:
```typescript
export const schema = z.object({
  field: z.string().min(1)
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const validated = schema.parse(Object.fromEntries(formData));
  // Process
  return json({ success: true });
}
```

**Conditional Rendering by Variant**:
```typescript
const variant = useDeviceVariant();

{variant !== 'core' && <FeatureComponent />}
```

**Loading State**:
```typescript
const navigation = useNavigation();
const isLoading = navigation.state === 'loading';

{isLoading ? <Spinner /> : <Content />}
```

---

## 🎓 Learning Resources

### Remix Documentation
- **Official Docs**: https://remix.run/docs
- **File-based Routing**: https://remix.run/docs/en/main/file-conventions/routes
- **Actions & Loaders**: https://remix.run/docs/en/main/route/action

### Prisma Documentation
- **Schema**: https://www.prisma.io/docs/concepts/components/prisma-schema
- **Queries**: https://www.prisma.io/docs/concepts/components/prisma-client/crud
- **Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate

### Component Library
- **shadcn/ui**: https://ui.shadcn.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## 💡 Tips for AI Assistants

When working with this codebase:

1. **Always check variant compatibility** before suggesting features
2. **Prioritize performance** - remember it runs on Pi Zero 2 W
3. **Maintain security** - validate inputs, check auth, log actions
4. **Keep mobile-first** - test responsive design at 320px
5. **Handle errors gracefully** - never crash, always degrade nicely
6. **Follow existing patterns** - consistency over cleverness
7. **Think local-first** - no cloud assumptions
8. **Consider Pi services** - dashboard is just UI, not device logic
9. **Test before claiming done** - unit + integration + E2E
10. **Document changes** - update relevant .md files

---

## ✅ Modification Approval Checklist

Before considering a change complete, verify:

- [ ] Code follows existing patterns
- [ ] Works on all variants (or properly gated)
- [ ] Mobile responsive (tested at 320px, 768px, 1024px)
- [ ] Authenticated routes require auth
- [ ] All inputs validated with Zod
- [ ] Errors handled gracefully
- [ ] Loading states implemented
- [ ] Empty states handled
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Runs on Pi Zero 2 W (< 80MB RAM)
- [ ] No console.log statements
- [ ] Audit log for sensitive changes
- [ ] TypeScript strict mode passes
- [ ] Linter passes without warnings

---

**Last Updated**: October 2025  
**Maintainers**: YoyoPod Team  
**Questions?** Check [INTEGRATION.md](INTEGRATION.md) or open an issue

---

*This guide is a living document. Update it as the codebase evolves!*