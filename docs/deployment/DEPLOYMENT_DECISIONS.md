# Deployment Architecture Decisions

## Overview

This document records key architectural decisions made for the validate-frontend deployment, particularly around API proxying and Kubernetes configuration.

---

## Problem Statement

The frontend application makes API calls to `/api/*` endpoints. In production:
- The app is built as static files and served by nginx
- Nginx was trying to serve `/api/*` requests as static files → 404 errors
- API calls were failing because there was no proxy configuration

**Solution:** Configure nginx to proxy `/api/*` requests to the backend API server.

---

## Decision 1: Runtime Configuration vs Build-Time Configuration

### The Choice

We chose **runtime configuration** (template-based nginx config) over **build-time configuration** (Vite env vars baked into JavaScript).

### Why Runtime Configuration?

**Our code structure:**
```typescript
// src/lib/api.ts
const api = axios.create({
  baseURL: "/api",  // Relative path, not absolute URL
});
```

The frontend uses **relative paths** (`/api`), which means:
- ✅ JavaScript doesn't need to know the API URL
- ✅ Nginx can handle the proxying
- ✅ Perfect fit for runtime configuration

**Benefits:**
- ✅ One Docker image for all environments (staging and production)
- ✅ Change API URL without rebuilding
- ✅ Simpler CI/CD pipeline (build once, deploy everywhere)
- ✅ Test different API URLs locally with the same image

**Alternative (Build-Time):**
- ❌ Would require code changes (switch to absolute URLs)
- ❌ Need separate Docker images for each environment
- ❌ Must rebuild to change API URL
- ❌ More complex CI/CD

### Comparison with Other Frontend

The other frontend uses build-time configuration because:
- It uses absolute URLs in JavaScript (`import.meta.env.VITE_API_PROXY`)
- It doesn't need API proxying (or handles it differently)
- Same config works for all environments

**Conclusion:** Each approach fits its specific needs. Runtime config is best for validate-frontend at this time.

---

## Decision 2: Nginx Template vs Static Config

### The Choice

We chose **nginx template with environment variable substitution** over **static nginx.conf file**.

### Why Template Approach?

**Requirements:**
- Different API URLs for staging vs production:
  - Staging: `https://stage-pipeline-api.klimatkollen.se`
  - Production: `https://pipeline-api.klimatkollen.se`

**Template approach:**
- ✅ Same Docker image, different runtime configuration
- ✅ API URL injected via Kubernetes environment variables
- ✅ Flexible and maintainable

**Static config alternative:**
- ❌ Would need separate nginx.conf files per environment
- ❌ Would need separate Docker images
- ❌ Less flexible

### Implementation

**Files:**
- `nginx.conf.template` - Template with `${BACKEND_API_URL}` variable
- `docker-entrypoint.sh` - Processes template at container startup
- Extracts hostname for proper Host header

**Flow:**
```
Container starts → Entrypoint runs → Template processed → Nginx config created → Nginx starts
```

---

## Decision 3: Kubernetes Base/Overlay Pattern

### The Choice

We use Kustomize base/overlay pattern to separate common and environment-specific configuration.

### Structure

```
k8s/
├── base/                    # Common configuration
│   ├── deployment.yaml      # Base deployment (defaults to staging API)
│   ├── ingress.yaml         # Base ingress (environment-agnostic)
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── staging/             # Staging-specific overrides
    │   ├── ingress-patch.yaml
    │   ├── namespace.yaml
    │   └── kustomization.yaml
    └── production/          # Production-specific overrides
        ├── ingress-patch.yaml
        ├── deployment-patch.yaml  # Overrides API URL
        ├── namespace.yaml
        └── kustomization.yaml
```

### Key Decisions

1. **Base ingress is environment-agnostic**
   - Contains common config (cert-manager annotation, ingressClassName)
   - No host-specific rules or TLS config
   - Each overlay adds environment-specific host and TLS

2. **Base deployment defaults to staging API**
   - Safe default (staging is less critical)
   - Production overlay overrides with production API URL

3. **Namespace resources in overlays**
   - Explicit namespace management
   - GitOps best practice (infrastructure as code)
   - Idempotent (won't error if namespace exists)

---

## Decision 4: Host Header Configuration

### The Problem

When using a variable in `proxy_pass`, nginx doesn't automatically set the Host header correctly. This can cause 502 errors if the backend requires a specific Host header.

### The Solution

Extract hostname from `BACKEND_API_URL` and set it explicitly:

**docker-entrypoint.sh:**
```bash
# Extract hostname from BACKEND_API_URL
BACKEND_HOST=$(echo "$BACKEND_API_URL" | sed -E 's|^https?://||' | sed -E 's|/.*$||')
export BACKEND_HOST
```

**nginx.conf.template:**
```nginx
proxy_set_header Host ${BACKEND_HOST};
```

This ensures the Host header matches the backend API domain, not the frontend domain.

---

## Key Changes Summary

### Docker
- ✅ Added nginx template processing (gettext, envsubst)
- ✅ Custom entrypoint script to process template at runtime
- ✅ Extracts hostname for proper Host header

### Kubernetes
- ✅ Base/overlay pattern for environment separation
- ✅ Environment variables for API URL configuration
- ✅ Proper ingress configuration (cert-manager, ingressClassName)
- ✅ Explicit namespace resources

### Nginx
- ✅ API proxy configuration (`location /api`)
- ✅ Proper proxy headers (Host, X-Real-IP, etc.)
- ✅ Timeout configuration
- ✅ Static file serving with SPA routing

---

## Testing

See [Local Testing Guide](../testing/LOCAL_TESTING.md) for instructions on testing the Docker image locally before deploying.

---

## Deployment Flow

1. **Build** - CI builds Docker image with nginx template
2. **Deploy to Staging** - Kubernetes sets `BACKEND_API_URL=stage-pipeline-api.klimatkollen.se`
3. **Test** - Verify API calls work in staging
4. **Deploy to Production** - Kubernetes sets `BACKEND_API_URL=pipeline-api.klimatkollen.se`
5. **Verify** - Confirm production API calls work

---

## Flux Integration

Flux automatically manages image updates:
- **Staging**: Updates automatically with `-rc` versions
- **Production**: Only updates with stable versions (no `-rc`)
- Image tags in kustomization.yaml are managed by Flux ImagePolicy

See Flux annotations in kustomization files:
```yaml
newTag: '1.1.0' # {"$imagepolicy": "flux-system:validate-frontend:tag"}
```

---

## Decision 5: Authentication System Implementation

### The Problem

The validate tool is an **internal tool** used for validating and processing pipeline data. Without authentication:
- ❌ Anyone with access to the URL could use the tool
- ❌ Unauthorized users could trigger pipeline processing
- ❌ No audit trail of who performed which actions
- ❌ Risk of unintended usage and resource consumption

**Solution:** Implement GitHub OAuth authentication to restrict access to authorized users only.

### Why Authentication Was Added

1. **Internal Tool Requirement**
   - The validate tool is intended for internal use only
   - Not a public-facing application
   - Access should be restricted to authorized team members

2. **Prevent Unintended Usage**
   - Pipeline processing consumes resources
   - Unauthorized usage could impact system performance
   - Need to control who can trigger processing jobs

3. **Security and Audit Trail**
   - Track which users perform which actions
   - Enable accountability for pipeline operations
   - Protect sensitive data and operations

### Architecture Decision: Dual API Setup

**Key Decision:** Authentication uses a **separate API backend** from the main pipeline API.

**Pipeline API** (`/api`):
- Used for all application data (queues, jobs, processes)
- Environments:
  - Dev: `https://stage-pipeline-api.klimatkollen.se` (via vite proxy)
  - Staging: `https://stage-pipeline-api.klimatkollen.se`
  - Production: `https://pipeline-api.klimatkollen.se`

**Auth API** (separate backend):
- Used ONLY for authentication endpoints
- Environments:
  - Dev: `https://stage-api.klimatkollen.se` (via `/api/auth` proxy) or `localhost:PORT`
  - Staging: `https://stage-api.klimatkollen.se`
  - Production: `https://api.klimatkollen.se`
- Endpoints:
  - `GET /api/auth/github` - OAuth initiation (redirects to GitHub)
  - `POST /api/auth/github` - Token exchange (accepts `{ code: string }`)

**Why Separate APIs?**
- Auth API is shared infrastructure (used by other Klimatkollen applications)
- Pipeline API is specific to this tool
- Separation of concerns
- Reuses existing authentication infrastructure

### Implementation Overview

**Frontend Components:**
1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Manages authentication state
   - Handles login, token exchange, logout
   - Auto-logout on token expiration
   - Token stored in `localStorage`

2. **ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
   - Route guard that blocks unauthenticated access
   - Shows login modal if user is not authenticated
   - All routes are protected by default

3. **AuthCallback** (`src/pages/AuthCallback.tsx`)
   - Handles OAuth callback from GitHub
   - Exchanges OAuth code for JWT token
   - Redirects user back to original page

4. **Auth API Client** (`src/lib/auth-api.ts`)
   - Separate axios instance for auth endpoints
   - Environment-aware URL detection
   - Dev: Uses `/authapi` proxy
   - Production: Auto-detects from hostname

5. **Pipeline API Middleware** (`src/lib/api.ts`)
   - Adds `Authorization: Bearer <token>` header to all requests
   - Handles 401 responses (triggers logout)
   - Updates token from `x-auth-token` response header

### Authentication Flow

```
1. User visits app → ProtectedRoute checks for token
   ↓
2. No token → Shows login modal
   ↓
3. User clicks "Logga in med GitHub"
   ↓
4. Redirects to auth API: https://api.klimatkollen.se/api/auth/github
   ↓
5. User authenticates with GitHub
   ↓
6. GitHub redirects to: /auth/callback?code=XXX
   ↓
7. AuthCallback exchanges code for JWT token
   ↓
8. Token saved to localStorage
   ↓
9. User redirected to original page
   ↓
10. All API requests include Authorization: Bearer <token> header
```

### Token Management

- **Storage:** `localStorage.getItem("token")`
- **Expiration:** Auto-checked on mount and before API requests
- **Auto-logout:** Timer set based on token expiration (JWT `exp` claim)
- **401 Handling:** Automatically clears token and triggers logout
- **Token Updates:** Pipeline API can send new token in `x-auth-token` response header

### Environment Configuration

**Development:**
- Auth API proxy configured in `vite.config.ts`:
  ```typescript
  "/api/auth": {
    target: "https://stage-api.klimatkollen.se",
    // or "http://localhost:3000" for local auth API
  }
  ```

**Production/Staging:**
- Auth API URL auto-detected from hostname:
  - `stage.*` → `https://stage-api.klimatkollen.se`
  - Otherwise → `https://api.klimatkollen.se`

### Critical Security Requirement

⚠️ **IMPORTANT:** Frontend blocking is **UX only, not security**.

The **pipeline-api backend MUST validate JWT tokens** on every request. Without backend validation:
- Anyone can bypass frontend by making direct API calls
- Frontend code can be modified in browser
- JavaScript can be disabled
- No real security exists

**Backend must:**
1. Extract token from `Authorization: Bearer <token>` header
2. Verify token signature (using same secret as auth API)
3. Check token expiration
4. Return `401 Unauthorized` if token is missing/invalid/expired

See [Backend Authentication Requirements](../auth/BACKEND_AUTH_REQUIREMENTS.md) for detailed backend implementation requirements.

### Files Created/Modified

**Created:**
- `src/lib/auth-types.ts` - Type definitions
- `src/lib/auth-api.ts` - Auth API client
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/components/ProtectedRoute.tsx` - Route guard
- `src/pages/AuthCallback.tsx` - OAuth callback handler

**Modified:**
- `src/lib/api.ts` - Added auth middleware
- `src/App.tsx` - Wrapped with AuthProvider and ProtectedRoute
- `vite.config.ts` - Added `/authapi` proxy

**Dependencies:**
- `jwt-decode` - For decoding JWT tokens

### Testing

**Verify Frontend:**
1. Visit app without token → Should show login modal
2. Complete GitHub auth → Should redirect and show app
3. Refresh page → Should remain authenticated
4. Wait for token expiration → Should auto-logout

**Verify Backend (Critical):**
```bash
# Should return 401 if backend validates tokens
curl https://pipeline-api.klimatkollen.se/api/queues/myqueue

# Should return 401 with invalid token
curl https://pipeline-api.klimatkollen.se/api/queues/myqueue \
  -H "Authorization: Bearer invalid-token"
```

If either returns `200 OK`, the backend is not validating tokens and needs to be fixed.

### Future Considerations

- Consider adding user info display in header
- Add logout button in UI
- Consider token refresh mechanism if needed
- Monitor authentication failures and rate limiting
- Consider adding role-based access control if needed

---

## Future Considerations

### Potential Enhancements
- Add bot detection (like other frontend)
- Add language routing if needed
- Configure separate screenshots API endpoint if needed
- Add more environment-specific configuration via templates

### Maintenance
- Keep nginx template in sync with other frontend features if needed
- Monitor proxy performance and adjust timeouts if necessary
- Consider adding health checks for backend API

---

## References

- [Local Testing Guide](../testing/LOCAL_TESTING.md)
- [Authentication Documentation](../auth/AUTHENTICATION.md) - Complete authentication system documentation
- [Backend Authentication Requirements](../auth/BACKEND_AUTH_REQUIREMENTS.md) - Backend validation requirements
- [Kubernetes Kustomize Documentation](https://kustomize.io/)
- [Nginx proxy_pass Documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)
