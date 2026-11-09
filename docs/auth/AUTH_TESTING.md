# Authentication Testing Guide

This document outlines manual and automated tests for the authentication system, focusing on write-operation-only authentication. This is mostly for memory, helping debugging and as a reminder to set up and add unit tests for the auth flow.

## Test Setup

### Prerequisites

1. Clear browser localStorage before each test session
2. Have a valid GitHub account for OAuth testing
3. Ensure local auth API is running on port 3000 (for dev testing)

## Manual Testing Checklist

### ✅ Basic Functionality

#### Test 1: Unauthenticated User Can View App

- [ ] Open app in incognito/private window
- [ ] Verify all pages load without login modal
- [ ] Verify queues, jobs, and data are visible
- [ ] Verify header shows "Logga in" button

#### Test 2: Write Operation Triggers Login Modal

- [ ] Without logging in, try to upload a URL
- [ ] Verify login modal appears
- [ ] Verify modal cannot be closed (no X button)
- [ ] Verify modal message is appropriate

#### Test 3: Login Flow

- [ ] Click "Logga in med GitHub" in modal
- [ ] Verify redirect to GitHub OAuth
- [ ] Verify `redirect_uri` parameter is correct
- [ ] Complete GitHub authentication
- [ ] Verify redirect back to `/auth/callback`
- [ ] Verify token is stored in localStorage
- [ ] Verify user name appears in header
- [ ] Verify original write action retries automatically

#### Test 4: Authenticated User Can Perform Writes

- [ ] While logged in, upload a URL
- [ ] Verify request includes `Authorization: Bearer <token>` header
- [ ] Verify operation succeeds
- [ ] Try retry job operation
- [ ] Verify it works without login prompt

#### Test 5: Pipeline GETs Send JWT When Logged In

- [ ] Log in
- [ ] Open Jobbstatus and a job dialog; check Network for `GET …/queues/…` / `…/processes/…`
- [ ] Verify requests include `Authorization: Bearer <token>`
- [ ] Open Climate Pipeline with a PDF-parsing thread; verify PDF-parsing poll includes Bearer
- [ ] Logout (clear token); those GETs should 401 / empty once pipeline-api JWT-on-GET is deployed (no write login modal)

### ✅ Edge Cases

#### Test 6: Token Expires During Write Operation

- [ ] Log in and get valid token
- [ ] Manually set token expiration to past time in localStorage
- [ ] Try to perform write operation
- [ ] Verify 401 response triggers login modal
- [ ] Verify login allows retry

#### Test 7: Multiple Simultaneous Write Attempts

- [ ] Without logging in, quickly click multiple write buttons
- [ ] Verify only one login modal appears
- [ ] Verify all actions are queued
- [ ] After login, verify all actions execute

#### Test 8: User Closes Modal Without Logging In

- [ ] Trigger login modal via write operation
- [ ] Try to close modal (should not be possible)
- [ ] If modal can be closed, verify action fails gracefully
- [ ] Verify error message is shown

#### Test 9: Login Fails

- [ ] Trigger login modal
- [ ] Cancel GitHub OAuth (or simulate failure)
- [ ] Verify error handling
- [ ] Verify original action does not execute
- [ ] Verify user can retry

#### Test 10: Token Refresh After Login

- [ ] Log in
- [ ] Perform write operation
- [ ] If backend returns new token in `x-auth-token` header
- [ ] Verify token is updated in localStorage
- [ ] Verify AuthContext updates

#### Test 11: Network Error During Write

- [ ] Log in
- [ ] Disconnect network
- [ ] Try write operation
- [ ] Verify appropriate error message
- [ ] Verify no login modal (already authenticated)

#### Test 12: Invalid Token in localStorage

- [ ] Manually set invalid token: `localStorage.setItem("token", "invalid")`
- [ ] Try write operation
- [ ] Verify 401 response
- [ ] Verify login modal appears
- [ ] Verify token is cleared

#### Test 13: Page Refresh After Login

- [ ] Log in
- [ ] Refresh page
- [ ] Verify token persists
- [ ] Verify user remains authenticated
- [ ] Verify header shows user name

#### Test 14: Logout Functionality

- [ ] While logged in, click "Logga ut"
- [ ] Verify token is cleared from localStorage
- [ ] Verify header shows "Logga in" button
- [ ] Verify write operations trigger login modal again

### ✅ API Interceptor Tests

#### Test 15: Axios Write Operations

- [ ] Without auth, trigger any axios POST/PUT/PATCH/DELETE
- [ ] Verify interceptor shows login modal
- [ ] Verify request is not sent until authenticated

#### Test 16: Fetch Write Operations

- [ ] Without auth, trigger any `authenticatedFetch` POST/PUT/PATCH/DELETE
- [ ] Verify login modal appears
- [ ] Verify request retries after login

#### Test 17: Read Operations Don't Require Auth

- [ ] Without auth, trigger GET requests via axios
- [ ] Verify no login modal
- [ ] Verify requests proceed normally

### ✅ Component-Specific Tests

#### Test 18: UploadTab Write Operation

- [ ] Without auth, try to submit URL
- [ ] Verify login modal
- [ ] After login, verify URL submission retries
- [ ] Verify success message appears

#### Test 19: Job Retry Operations

- [ ] Without auth, try to retry a job
- [ ] Verify login modal
- [ ] After login, verify retry executes
- [ ] Verify job status updates

#### Test 20: Rerun and Save Operations

- [ ] Without auth, try "rerun and save" for scope 1+2
- [ ] Verify login modal
- [ ] After login, verify operation completes

## Automated Testing (When Framework is Set Up)

### Unit Tests Needed

1. **LoginModal Component**
   - Renders correctly
   - Calls login() on button click
   - Shows correct message

2. **GlobalLoginModal Component**
   - Listens for show-login-modal event
   - Opens modal when event fired
   - Executes pending action after authentication
   - Handles multiple simultaneous events

3. **authenticatedFetch Helper**
   - Returns promise for write operations without token (login modal)
   - Adds auth header whenever a token exists (GET and writes)
   - GET without a token is not blocked client-side
   - Handles retry after login for writes

4. **API Interceptor / garboAuthFetch**
   - Checks auth for write operations
   - Shows login modal for unauthenticated writes
   - Adds auth header when token exists
   - On 401: clears token; writes may open login modal; GETs dispatch `auth-required`

5. **AuthContext**
   - Loads token from localStorage on mount
   - Validates token expiration
   - Sets auto-logout timer
   - Handles token updates

## Network Tab Verification

### What to Check in Browser DevTools → Network

1. **Write Operations Without Auth:**
   - Request should NOT be sent
   - Login modal should appear instead

2. **Write Operations With Auth:**
   - Request should include: `Authorization: Bearer <token>`
   - Request should proceed normally

3. **Read Operations (pipeline / JWT-gated):**
   - When logged in: must include `Authorization: Bearer <token>`
   - When logged out: may 401 from the backend (no write login modal)

4. **401 Responses:**
   - For write operations: Should trigger login modal
   - For read operations: Should clear token / `auth-required` (no write modal)

## Common Issues to Watch For

1. **Login modal appears for GET requests** ❌
   - Should only appear for write operations

2. **Write operations proceed without auth** ❌
   - Should be blocked and show login modal

3. **Actions don't retry after login** ❌
   - Should automatically retry pending actions

4. **Multiple login modals appear** ❌
   - Should only show one modal

5. **Token not persisted after refresh** ❌
   - Should load from localStorage

6. **Auto-logout not working** ❌
   - Should logout when token expires

## Success Criteria

✅ All manual tests pass
✅ No console errors
✅ Network requests behave correctly
✅ User experience is smooth
✅ Edge cases handled gracefully
✅ No security issues (backend still validates)
