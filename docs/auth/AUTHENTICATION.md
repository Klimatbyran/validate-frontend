# Authentication System Documentation

## Overview

The validate tool implements GitHub OAuth authentication with **write-only protection**. This means:

- ✅ **Read operations (GET)** - No authentication required, anyone can view data
- 🔒 **Write operations (POST, PUT, PATCH, DELETE)** - Authentication required

This is an **internal tool** and authentication was added to:

1. **Prevent Unintended Usage** - Control who can trigger pipeline processing jobs
2. **Enable Audit Trail** - Track which users perform which actions
3. **Protect Resources** - Prevent unauthorized consumption of pipeline resources
4. **Maintain Usability** - Allow viewing data without login barriers

## Architecture

### Dual API Setup

Authentication uses a **separate API backend** from the main pipeline API:

**Pipeline API** (`/api`):
- Handles all application data (queues, jobs, processes)
- **Only validates JWT tokens on write operations** (POST, PUT, PATCH, DELETE)
- Read operations (GET) are unprotected - frontend handles auth for UX
- Environments:
  - Dev: `https://stage-pipeline-api.klimatkollen.se` (via vite proxy)
  - Staging: `https://stage-pipeline-api.klimatkollen.se`
  - Production: `https://pipeline-api.klimatkollen.se`

**Auth API** (separate backend):
- Handles authentication only
- Endpoints:
  - `GET /api/auth/github?redirect_uri=...` - OAuth initiation (redirects to GitHub)
  - `POST /api/auth/github` - Token exchange (accepts `{ code: string, state?: string }`)
- Environments:
  - Dev: `https://stage-api.klimatkollen.se` (via `/api/auth` proxy) or `localhost:PORT`
  - Staging: `https://stage-api.klimatkollen.se`
  - Production: `https://api.klimatkollen.se`

### Why Separate APIs?

- Auth API is shared infrastructure (used by other Klimatkollen applications)
- Pipeline API is specific to this tool
- Separation of concerns
- Reuses existing authentication infrastructure

## Authentication Flow

```
1. User visits app
   ↓
2. App loads without authentication requirement
   ↓
3. User can view all data (read operations work without auth)
   ↓
4. User attempts write operation (upload, retry, etc.)
   ↓
5. API interceptor checks: Is this a write operation? Do we have a token?
   ↓
6. No token → Shows login modal (blocks request)
   ↓
7. User clicks "Logga in med GitHub"
   ↓
8. Current URL saved to localStorage as "postLoginRedirect"
   ↓
9. Frontend constructs callback URL using current origin
   ↓
10. Redirects to: GET /api/auth/github?redirect_uri=...
   ↓
11. Main Auth API redirects to GitHub with redirect_uri
   ↓
12. User authenticates with GitHub
   ↓
13. GitHub redirects to: /auth/callback?code=XXX&state=YYY
   ↓
14. AuthCallback page extracts code and state from URL
   ↓
15. Calls authenticate(code, state) → POST to auth API /api/auth/github { code, state }
   ↓
16. Auth API returns: { token, redirect_uri? }
   ↓
17. Token saved to localStorage and state
   ↓
18. User info decoded from token
   ↓
19. Auto-logout timer set based on token expiration
   ↓
20. User redirected back to app
   ↓
21. Original write operation automatically retries with token
   ↓
22. All future write operations include: Authorization: Bearer <token>
```

## Components

### 1. AuthContext (`src/contexts/AuthContext.tsx`)

React context managing authentication state.

**State:**
- `token: string | null` - JWT token from localStorage
- `user: User | null` - Decoded user info from token
- `isLoading: boolean` - Initial auth check state
- `isAuthenticated: boolean` - Computed from token and user

**Functions:**
- `login()` - Saves current URL and redirects to GitHub OAuth with redirect_uri
- `authenticate(code, state?)` - Exchanges OAuth code (and optional state) for JWT token
- `logout()` - Clears token and user info

**Features:**
- Auto-loads token from localStorage on mount
- Validates token expiration on mount
- Sets auto-logout timer based on token expiration
- Listens for token updates from API responses
- Listens for auth-required events (401 responses)

### 2. LoginModal (`src/components/LoginModal.tsx`)

Reusable login modal component that can be controlled externally.

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Called when modal should close
- `message?: string` - Optional custom message

**Behavior:**
- Shows GitHub login button
- Calls `login()` from AuthContext when button clicked
- Can be used by GlobalLoginModal or other components

### 3. GlobalLoginModal (`src/components/GlobalLoginModal.tsx`)

Application-level component that listens for write-operation authentication requirements.

**Features:**
- Listens for `show-login-modal` custom events
- Queues multiple pending actions if triggered simultaneously
- Executes all queued actions after successful authentication
- Manages modal visibility state

**Event Detail:**
```typescript
{
  action: () => void | Promise<void>; // Function to retry after login
}
```

### 4. ProtectedRoute (`src/components/ProtectedRoute.tsx`)

**Note:** This component is no longer used for route protection. It was kept for potential future use but routes are now unprotected, with write operations requiring authentication instead.

### 5. AuthCallback (`src/pages/AuthCallback.tsx`)

Handles OAuth callback from GitHub.

**Responsibilities:**
- Extracts `code`, `state`, and optionally `token` from URL query params
- If token is in URL: Validates, stores, and redirects (for backend redirects with token)
- If code is in URL: Calls `authenticate(code, state)` from AuthContext
- Shows loading state during authentication
- Handles errors (invalid code, network errors, etc.)
- Redirect handled by AuthContext (uses redirect_uri from backend or falls back)

### 6. Auth API Client (`src/lib/auth-api.ts`)

Separate axios instance for authentication endpoints.

**Features:**
- Environment-aware URL detection
- Dev: Uses `/api/auth` proxy (configured in vite.config.ts) for API calls
- Production: Auto-detects from hostname, uses absolute URLs
- Functions:
  - `getCallbackUrl()` - Determines callback URL based on environment
  - `authenticateWithGithub(code, state?)` - Exchange code (and optional state) for token
  - `getGithubAuthUrl()` - Get OAuth initiation URL with redirect_uri parameter

**Base URL Configuration:**
- Dev: `/api/auth` (relative path, uses Vite proxy)
- Production: `https://api.klimatkollen.se/api/auth` or `https://stage-api.klimatkollen.se/api/auth` (absolute URL)

### 7. Pipeline API Middleware (`src/lib/api.ts`)

Auth middleware for pipeline API requests with write-only protection.

**Request Interceptor:**
- Checks if request method is a write operation (POST, PUT, PATCH, DELETE)
- If write operation and no token: dispatches `show-login-modal` event and rejects promise
- Otherwise: Adds `Authorization: Bearer <token>` header if token exists
- Gets token from localStorage

**Response Interceptor:**
- Checks for `x-auth-token` header in responses
- Updates token if new one is provided
- Handles 401 responses:
  - Always clears token from localStorage
  - If write operation: dispatches `show-login-modal` event with retry action
  - If read operation: dispatches `auth-required` event (triggers logout)

### 8. API Helpers (`src/lib/api-helpers.ts`)

Helper functions for direct `fetch()` calls that need authentication.

**Functions:**
- `isWriteOperation(method: string | undefined): boolean` - Checks if method is a write operation
- `authenticatedFetch(url: string, options?: RequestInit): Promise<Response>` - Wrapper for `fetch()` that:
  - Checks if operation is a write method
  - If write and no token: dispatches `show-login-modal` event and returns promise that resolves/rejects based on retry
  - Otherwise: Adds Authorization header and proceeds with fetch

### 9. Header Component (`src/components/ui/header.tsx`)

Displays authentication status and controls in the upper right corner.

**Features:**
- Shows login button when user is not authenticated
- Shows user greeting ("Hej, [name]") and logout button when authenticated
- Logout button styled with blue icon matching the document icon
- Positioned in upper right corner of header

## Token Management

### Storage

- **Token:** `localStorage.getItem("token")`
- **Redirect URL:** `localStorage.getItem("postLoginRedirect")`

### Token Structure

JWT token payload contains:
```typescript
{
  name: string;
  id: string;
  email: string;
  githubId: string | null;
  githubImageUrl: string | null;
  exp: number; // expiration timestamp (seconds since epoch)
  iat?: number; // issued at timestamp
}
```

### Validation

Token expiration is checked:
- On app mount (validates stored token)
- When token changes (sets new auto-logout timer)
- When tab becomes visible (checks if token expired while away)
- Via auto-logout timer (client-side based on JWT `exp` claim)
- On 401 responses from write operations (backend validation)

### Auto-Logout

**Client-Side Timer:**
- Calculates milliseconds until token expires (from JWT `exp` claim)
- Sets `setTimeout` to trigger logout when token expires
- Automatically clears timer if token changes

**Backend Validation:**
- Backend only validates tokens on write operations (POST, PUT, PATCH, DELETE)
- GET requests don't validate tokens, so periodic validation via GET is not possible
- Token validation happens when:
  - User attempts write operation → backend validates → 401 if invalid
  - Client-side timer expires → logout triggered
  - Tab becomes visible → checks if token expired while away

**Note:** Since backend doesn't validate GET requests, we rely on:
1. Client-side timer (handles normal expiration)
2. 401 responses from write operations (handles revocation and clock skew)
3. Visibility change check (catches expiration when user returns to tab)

## Environment Configuration

### Development

**Vite Proxy** (`vite.config.ts`):
```typescript
// Auth API endpoints - must come before /api to match first
"/api/auth": {
  target: "https://stage-api.klimatkollen.se", // Staging auth API (for testing)
  // For local auth API, use: "http://localhost:3000"
  changeOrigin: true,
  secure: true, // Set to true for HTTPS
  // Used for OAuth initiation (browser navigation)
}

"/authapi": {
  target: "https://stage-api.klimatkollen.se", // Staging auth API (for testing)
  // For local auth API, use: "http://localhost:3000"
  changeOrigin: true,
  secure: true, // Set to true for HTTPS, false for localhost
  rewrite: (path) => path.replace(/^\/authapi/, ""),
  // Legacy proxy, kept for compatibility
}
```

**Auth API Client:**
- Uses `/api/auth` proxy path in dev (for axios API calls)
- Uses relative paths for browser navigation (goes through `/api/auth` proxy)
- Proxy routes to appropriate backend

### Production/Staging

**Auto-Detection:**
- Checks `window.location.hostname`
- If hostname includes `stage` or `staging`:
  - Auth API: `https://stage-api.klimatkollen.se`
  - Callback URL: Uses `window.location.origin/auth/callback` (e.g., `https://validate-stage.klimatkollen.se/auth/callback`)
- Otherwise:
  - Auth API: `https://api.klimatkollen.se`
  - Callback URL: Uses `window.location.origin/auth/callback` (e.g., `https://validate.klimatkollen.se/auth/callback`)

**No Proxy Needed:**
- Direct API calls to auth API
- CORS must be configured on auth API

### Callback URL Configuration

The callback URL is automatically determined using `window.location.origin`:
- **Development:** `http://localhost:5173/auth/callback` (or whatever port Vite uses)
- **Staging:** `https://validate-stage.klimatkollen.se/auth/callback`
- **Production:** `https://validate.klimatkollen.se/auth/callback`

This ensures the callback always redirects back to the same frontend that initiated the OAuth flow, regardless of the environment.

The callback URL is passed as `redirect_uri` query parameter when initiating OAuth:
```
GET /api/auth/github?redirect_uri=https://validate.klimatkollen.se/auth/callback
```

The backend may return a `redirect_uri` in the authentication response, which takes precedence over the stored redirect.

## Security Considerations

### Frontend vs Backend Security

⚠️ **CRITICAL:** Frontend blocking is **UX only, not security**.

**Frontend blocking can be bypassed:**
- Direct API calls (curl, Postman, browser dev tools)
- Disabling JavaScript
- Modifying frontend code
- Browser extensions

**Backend MUST validate tokens:**
- Extract token from `Authorization: Bearer <token>` header
- Verify token signature (using same secret as auth API)
- Check token expiration
- Return `401 Unauthorized` if token is missing/invalid/expired

See [Backend Authentication Requirements](./BACKEND_AUTH_REQUIREMENTS.md) for detailed backend implementation requirements.

### Token Storage

- **localStorage:** Standard for SPAs, but less secure than httpOnly cookies
- **XSS Risk:** Tokens accessible to JavaScript (XSS attacks)
- **Mitigation:** Use HTTPS, validate tokens on backend, implement CSP headers

### Best Practices

1. **Always use HTTPS** in production
2. **Backend validates every request** - Never trust the client
3. **Token expiration** - Tokens expire and require re-authentication
4. **Error handling** - Don't reveal too much in error messages
5. **Rate limiting** - Consider rate limiting on auth endpoints

## Testing

### Frontend Testing

1. **Visit app without token:**
   - Should load normally (no login modal)
   - Can view all data (read operations work)
   - Header shows "Logga in" button

2. **Attempt write operation without auth:**
   - Try to upload URL, retry job, etc.
   - Login modal should appear
   - Request should not be sent until authenticated

3. **Complete GitHub auth:**
   - Click "Logga in med GitHub" in modal
   - Should redirect to GitHub (with redirect_uri in URL)
   - Should redirect back to `/auth/callback?code=XXX&state=YYY`
   - Should redirect to final destination
   - Original write operation should retry automatically
   - Header should show user name and logout button

4. **Refresh page:**
   - Should remain authenticated
   - Token should persist in localStorage
   - Can perform write operations without re-login

5. **Token expiration:**
   - Wait for token to expire (or manually expire in localStorage)
   - Should auto-logout (header updates to show login button)
   - Write operations will trigger login modal again

### Backend Testing (Critical)

**Important:** Backend only validates tokens on write operations (POST, PUT, PATCH, DELETE). GET requests are not validated.

**Test 1: GET request without token (should work)**
```bash
curl https://pipeline-api.klimatkollen.se/api/queues/myqueue
```
**Expected:** `200 OK` (read operations don't require auth)

**Test 2: Write request without token**
```bash
curl -X POST https://pipeline-api.klimatkollen.se/api/queues/myqueue/rerun
```
**Expected:** `401 Unauthorized`

**Test 3: Write request with invalid token**
```bash
curl -X POST https://pipeline-api.klimatkollen.se/api/queues/myqueue/rerun \
  -H "Authorization: Bearer invalid-token-12345"
```
**Expected:** `401 Unauthorized`

**Test 4: Write request with expired token**
```bash
curl -X POST https://pipeline-api.klimatkollen.se/api/queues/myqueue/rerun \
  -H "Authorization: Bearer <expired-token>"
```
**Expected:** `401 Unauthorized`

**Test 5: Write request with valid token**
```bash
curl -X POST https://pipeline-api.klimatkollen.se/api/queues/myqueue/rerun \
  -H "Authorization: Bearer <valid-token>"
```
**Expected:** `200 OK` or appropriate success response

If tests 2-4 return `200 OK`, the backend is **not validating tokens on write operations** and needs to be fixed immediately.

## Troubleshooting

### Login modal doesn't appear for write operations
- Check browser console for errors
- Verify `jwt-decode` is installed: `npm install jwt-decode`
- Check that `AuthProvider` wraps the app in `App.tsx`
- Verify `GlobalLoginModal` is rendered in `App.tsx`
- Check that write operations use `api` (axios) or `authenticatedFetch`
- Verify API interceptor is working (check network tab)

### Write operations don't retry after login
- Check that token is saved to localStorage after login
- Verify `GlobalLoginModal` is executing pending actions
- Check browser console for errors
- Verify the action callback is properly stored

### 401 errors on write operations
- Verify token is in localStorage
- Check that backend validates tokens on write operations (see backend testing above)
- Verify token hasn't expired
- Check browser network tab for request headers
- For write operations: login modal should appear
- For read operations: should fail silently (no modal)

### Auth API not reachable in dev
- Check vite proxy configuration in `vite.config.ts`
- Verify auth API URL is correct
- Check network tab in browser dev tools
- Verify proxy is routing correctly

### Token expires too quickly
- Check token expiration time in JWT payload
- Verify auto-logout timer is set correctly
- Consider implementing token refresh if needed

## Files Reference

### Created Files
- `src/lib/auth-types.ts` - TypeScript type definitions
- `src/lib/auth-api.ts` - Auth API client
- `src/lib/api-helpers.ts` - Helper functions for authenticated fetch calls
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/components/LoginModal.tsx` - Reusable login modal component
- `src/components/GlobalLoginModal.tsx` - Application-level login modal manager
- `src/components/ProtectedRoute.tsx` - Route guard (no longer used, kept for reference)
- `src/pages/AuthCallback.tsx` - OAuth callback handler
- `src/hooks/useAuth.ts` - Hook for accessing AuthContext

### Modified Files
- `src/lib/api.ts` - Added write-only auth middleware (interceptors)
- `src/App.tsx` - Integrated AuthProvider and GlobalLoginModal (removed ProtectedRoute wrappers)
- `src/components/ui/header.tsx` - Added login/logout UI
- `src/components/tabs/upload/UploadTab.tsx` - Updated to use authenticatedFetch
- `src/components/job-specific-data-view.tsx` - Updated to use authenticatedFetch
- `src/components/job-details-dialog.tsx` - Updated to use authenticatedFetch
- `src/views/swimlane-queue-status.tsx` - Updated to use authenticatedFetch
- `vite.config.ts` - Added `/api/auth` and `/authapi` proxies

### Dependencies
- `jwt-decode` - For decoding JWT tokens
  ```bash
  npm install jwt-decode
  ```

## Related Documentation

- [Backend Authentication Requirements](./BACKEND_AUTH_REQUIREMENTS.md) - Backend validation requirements
- [Deployment Decisions](../deployment/DEPLOYMENT_DECISIONS.md) - Architecture decisions including auth

## Current Features

- ✅ Write-only authentication (read operations don't require login)
- ✅ User info display in header (greeting with user name)
- ✅ Logout button in UI (upper right corner)
- ✅ Login button when not authenticated
- ✅ Token extraction from URL (supports backend redirects with token in query params)
- ✅ Automatic retry of write operations after login
- ✅ Multiple simultaneous write attempts are queued and executed after login
- ✅ Client-side token expiration handling
- ✅ Visibility-based token validation (checks expiration when tab becomes visible)

## Future Enhancements

- Dedicated token validation endpoint (if backend adds one)
- Token refresh mechanism
- Role-based access control
- Audit logging of user actions
- Session management improvements
