# Smart Scheduler - Interview Preparation Guide

## 1. PROJECT OVERVIEW

**What it is:** A full-stack web application for scheduling meetings by finding optimal overlapping time slots between multiple participants.

**Key Problem Solved:** Users can't manually coordinate schedules across multiple people. Smart Scheduler automates this using a sweep line algorithm to find the best meeting times.

**Live URL:** https://smartschedulerr.netlify.app

---

## 2. TECH STACK

### Frontend
- **React** (with Vite for fast builds)
- **TypeScript** for type safety
- **Tailwind CSS** for responsive styling
- **React Router** for navigation
- **React Toastify** for notifications
- **Netlify** for hosting

### Backend
- **Node.js + Express.js** for REST API
- **TypeScript** for type safety
- **MongoDB + Mongoose** for data persistence
- **JWT** for authentication
- **Google APIs** (Calendar & Meet)
- **Render** for hosting

### Security & DevOps
- **Helmet** for security headers
- **CORS** with explicit whitelisting
- **Rate limiting** (100 req/15min general, 20 req/15min for auth)
- **bcrypt** for password hashing
- **express-validator** for input validation

---

## 3. CORE FEATURES & USER FLOW

### Authentication
- User registration/login with email & password (8+ char requirement)
- JWT tokens (7-day expiry)
- Password reset via email with secure tokens
- Input validation & error handling

### Friend Management
- Add friends by email
- Accept/reject friend requests
- View friends and pending requests
- Real-time notifications

### Meeting Scheduling (Main Feature)
1. **Host Creates Meeting:** Title, invitees, duration, date, time window
2. **Invitees Submit Availability:** Each invitee submits available time slots for that meeting
3. **Sweep Line Algorithm Finds Slots:** Identifies all times where host + invitees overlap
4. **Host Selects Slot:** Chooses best suggested time
5. **Google Meet Link Generated:** Meeting confirmed with automated link creation
6. **Notifications Sent:** Participants notified of finalized meeting

### Notification System
- Types: friend_request, meeting_invite, meeting_scheduled
- Persisted in MongoDB
- Read/unread tracking
- Real-time updates

---

## 4. DATABASE MODELS & RELATIONSHIPS

### User Model
```
{
  name, email, password (hashed),
  friends: [userId],           // Confirmed friends
  sentRequests: [userId],      // Pending requests sent by user
  receivedRequests: [userId],  // Pending requests received by user
  resetPasswordToken, resetPasswordExpiry
}
```

### Meeting Model
```
{
  title, description,
  host: userId,
  invitees: [userId],
  duration: minutes,
  meetingDate, windowStart (HH:MM), windowEnd (HH:MM),
  deadlineToRespond: Date,
  status: 'pending' | 'awaiting_selection' | 'finalized' | 'expired',
  suggestedSlots: [{start, end, availableUserIds}],
  finalizedSlot: {start, end, confirmedParticipants},
  meetLink: URL,
  inviteeResponses: [{user, timings: [{start, end}]}]
}
```

### Notification Model
```
{
  user: userId,
  type: 'friend_request' | 'meeting_invite' | 'meeting_scheduled',
  message, data (metadata),
  read: boolean
}
```

---

## 5. SWEEP LINE ALGORITHM (CORE LOGIC)

**Purpose:** Find all time slots where the host + at least one invitee are available.

**How It Works:**
1. Collect all start/end events from all participants' submitted timings
2. Sort events chronologically
3. Use a Set to track "active" participants at each time point
4. For each time interval, check:
   - Host is available
   - At least 2 people (host + ≥1 invitee) overlap
   - Duration is sufficient
5. Generate candidate slots with 5-min intervals
6. Return top N suggestions

**Time Complexity:** O(n log n) where n = total events
**Space Complexity:** O(n)

**Key Insight:** Breaks problem into intervals rather than checking every possible minute.

**Example:**
```
Host:    [10:00-11:00] [14:00-15:00]
Invitee1:    [10:30-11:30]
Invitee2:                [14:30-15:30]

Events sorted: 10:00(start-host), 10:30(start-inv1), 11:00(end-host), 11:30(end-inv1), 14:00(start-host), 14:30(start-inv2), 15:00(end-host), 15:30(end-inv2)

Intervals where host + ≥1 overlap:
- [10:30-11:00] (host, inv1)
- [14:30-15:00] (host, inv2)
```

---

## 6. BACKEND ARCHITECTURE

### Route Structure
```
/auth           → Register, Login, Password Reset
/users          → Friends, Requests, Search
/meetings       → Schedule, List, Submit Availability, Select Slot
/calendar       → Google Calendar Integration
/notification   → Fetch, Mark Read, Delete
```

### Middleware
- **authMiddleware:** Verifies JWT, extracts user ID
- **validate:** Express-validator for request body validation
- Rate limiting (general & auth-specific)
- CORS & Helmet for security

### Key Services
- **sweepLine.ts:** Meeting time algorithm
- **googleCalendar.ts:** OAuth2 setup, event creation
- **email.ts:** Password reset emails
- **logger.ts:** Structured logging (Pino)

### Error Handling
- Try-catch blocks in async operations
- Input validation before database queries
- Proper HTTP status codes
- Structured error responses

---

## 7. FRONTEND COMPONENT STRUCTURE

### Key Components
- **Login/Register:** Auth flows with validation
- **Dashboard:** Main hub, displays meetings & notifications
- **Calendar:** Visual calendar view, availability selection
- **MeetsPage:** View & manage scheduled meetings
- **MyFriendsPage:** Friends list, sent/received requests
- **SearchFriendsPage:** Find and add friends
- **NewConnectionPage:** Initiate friend requests
- **Navbar/Footer:** Navigation & branding
- **ErrorBoundary:** Catches crashes, prevents white screen

### State Management
- **AppContext:** Centralized global state (user, connections, meetings)
- Avoids prop drilling
- Consistent state updates across all components
- Single source of truth

### UI/UX Patterns
- Protected routes (redirect unauthenticated users)
- Toast notifications for feedback
- Responsive Tailwind design
- Loading states & error messages

---

## 8. API FLOW EXAMPLES

### Create Meeting
```
POST /api/schedule-meeting (auth required)
Request: { 
  title, 
  friendIds, 
  duration, 
  meetingDate, 
  windowStart, 
  windowEnd, 
  deadlineDays? 
}
Response: { message, meeting: {...} }

Process:
→ Creates Meeting document
→ Sends notifications to all invitees
→ Status: 'pending' (awaiting availability submissions)
```

### Submit Availability
```
POST /api/submit-availability (auth required)
Request: { 
  meetingId, 
  timings: [{start, end}, ...] 
}
Response: Meeting doc with updated responses

Process:
→ Adds user's availability to inviteeResponses
→ Auto-generates suggested slots
→ Status updates to 'awaiting_selection' when all respond
```

### Finalize Meeting
```
POST /api/finalize-meeting (auth required, host only)
Request: { 
  meetingId, 
  slot: {start, end} 
}

Process:
→ Generates Google Meet link
→ Updates finalizedSlot
→ Status: 'finalized'
→ Sends notifications to all participants
→ Records in ScheduledMeeting collection
```

### Accept Friend Request
```
POST /api/accept-request (auth required)
Request: { fromUserId }

Process:
→ Moves fromUserId from receivedRequests to friends
→ Removes user from fromUserId's sentRequests
→ Creates notification for fromUserId
```

---

## 9. DEPLOYMENT & DEVOPS

**Frontend:**
- Hosted on **Netlify** with auto-deploy from GitHub
- Environment: `VITE_API_URL` for backend endpoint
- Build: `npm run build` → Vite produces optimized bundle

**Backend:**
- Hosted on **Render** (Node.js environment)
- Automatic restart on code push
- Environment variables for MongoDB, JWT, Google APIs

**Database:**
- **MongoDB Atlas** (cloud managed)
- Automated backups
- Connection string in .env

**Google Credentials:**
- Loaded from environment variables (never committed)
- OAuth2 tokens stored server-side
- Refresh handled automatically

**Security:**
- HTTPS enforced
- CORS whitelisting (only Netlify frontend + localhost)
- Rate limiting per IP
- Helmet security headers

---

## 10. COMMON INTERVIEW QUESTIONS & TALKING POINTS

### Architecture & Design

**Q: Why use a sweep line algorithm for meeting scheduling?**
- Efficient handling of complex overlapping time slots
- O(n log n) complexity instead of O(n²) brute force
- Scales well as participant count increases
- Industry-standard for interval scheduling problems

**Q: How do you handle authentication?**
- JWT tokens with 7-day expiry stored in localStorage
- Bcrypt hashing with 10 salt rounds for password security
- Rate limiting on auth endpoints (20 req/15min) to prevent brute force
- Password reset with time-limited tokens sent via email
- Secure token validation before allowing password change

**Q: How is state managed in the frontend?**
- React Context API to avoid prop drilling
- Centralized AppContext with user, meetings, and connections state
- Context provider wraps entire app in main.tsx
- Clean component architecture without local duplicates

**Q: Why MongoDB instead of SQL?**
- Schema flexibility for varying invitee response counts
- Document nesting (inviteeResponses array within Meeting)
- Horizontal scalability with sharding
- Mongoose ODM provides type safety with TypeScript

### Technical Challenges

**Q: What challenges did you face?**

1. **Complex meeting state transitions:**
   - Managing pending → awaiting_selection → finalized → expired states
   - Ensuring data consistency across state changes
   - Solution: Clear state machine, validation at each transition

2. **Coordinating multi-user availability:**
   - Multiple invitees submit overlapping time windows
   - Solution: Sweep line algorithm handles complexity elegantly

3. **Google Meet link generation:**
   - Integration with Google Calendar API
   - OAuth2 token management
   - Solution: Server-side OAuth2 client, token refresh handling

4. **Timezone handling:**
   - Users in different timezones
   - Frontend converts to UTC for storage, backend converts back for display
   - Solution: Store in ISO format, convert on display

5. **Preventing brute-force attacks:**
   - Auth endpoints vulnerable to credential guessing
   - Solution: Implemented rate limiting, bcrypt with salt rounds

**Q: How do you handle errors?**
- Try-catch blocks wrap all async database operations
- Express-validator validates incoming requests before processing
- Error boundaries in React catch component crashes
- Structured logging with Pino for debugging production issues
- User-friendly error messages in responses

### Scalability & Performance

**Q: How would you scale this for 1M users?**

1. **Database Optimization:**
   - Add indexes on frequently queried fields (user, meeting, userId+read)
   - Query projection to fetch only needed fields
   - Pagination for large result sets (meetings list, friends list)
   - Connection pooling with MongoDB Atlas

2. **Caching:**
   - Redis cache for user profiles (TTL: 1 hour)
   - Cache suggested meeting slots (TTL: 24 hours)
   - Cache friend lists (TTL: 1 day)

3. **Background Jobs:**
   - Bull queue for email notifications (async, retry logic)
   - Scheduled jobs to mark meetings as "expired"
   - Batch processing for notification delivery

4. **API Optimization:**
   - Implement pagination for all list endpoints
   - Compression with gzip
   - CDN for static assets
   - Rate limiting per user, not just per IP

5. **Microservices (future):**
   - Separate email service
   - Separate notification service
   - Separate Google Calendar integration service

**Q: How would you optimize the sweep line algorithm?**
- Memoization: Cache suggested slots for repeated queries
- Process availability in background jobs, not on request
- Batch updates for multiple meetings
- Incremental updates (only recompute when new availability submitted)
- Parallel processing with worker threads for large participant sets

**Q: Database query optimization:**
- Index on (user, read) for fetching unread notifications
- Index on (host, status) for host's active meetings
- Index on (invitees, status) for invitee's meetings
- Lean queries (no hydration) when full documents not needed
- Population strategy: only populate needed references

### Security

**Q: What security measures are in place?**
- **Authentication:** JWT with 7-day expiry, secure token storage
- **Authorization:** Middleware verifies user ownership before operations
- **Password Security:** Bcrypt with 10 salt rounds, secure reset flow
- **Input Validation:** Express-validator sanitizes all inputs
- **Rate Limiting:** 100 req/15min general, 20 req/15min auth
- **CORS:** Whitelisted origins only (Netlify + localhost)
- **Security Headers:** Helmet.js sets strict headers
- **HTTPS:** Enforced in production
- **Environment Variables:** Never commit secrets

**Q: How do you handle Google OAuth credentials safely?**
- Credentials loaded from environment variables
- Never exposed to frontend
- Server-side OAuth2 client handles all operations
- Tokens stored in server files (not sent to client)
- Token refresh handled automatically before expiry

**Q: How would you handle a data breach?**
- Password hashing with bcrypt makes passwords unrecoverable
- JWT tokens have short 7-day expiry
- Compromised tokens: force logout, issue new tokens
- Compromised credentials: password reset flow
- Audit logs to detect suspicious activity

---

## 11. QUICK REFERENCE FACTS

- **Lines of Code:** ~3000 total (frontend + backend)
- **Database Collections:** 3 (User, Meeting, Notification)
- **REST Endpoints:** 20+ well-organized routes
- **Test Coverage:** Unit tests for auth routes & sweep line algorithm
- **Performance:** Average API response < 200ms
- **Security:** Rate limiting, CORS, JWT, bcrypt, Helmet
- **Deployment:** Automated CI/CD with GitHub → Netlify/Render
- **Time Complexity:** Sweep line algorithm O(n log n)

---

## 12. THINGS TO PRACTICE BEFORE INTERVIEW

1. **Run the app locally end-to-end:**
   - Register account
   - Add a friend
   - Create a meeting
   - Submit availability
   - See suggested slots
   - Finalize and receive notification

2. **Whiteboard the sweep line algorithm:**
   - Draw a timeline with host & invitee availability
   - Show events (start/end markers)
   - Trace through the algorithm step-by-step
   - Identify the resulting intervals

3. **Be ready to discuss trade-offs:**
   - React Context vs Redux
   - MongoDB vs PostgreSQL
   - Monolith vs Microservices
   - JWT vs sessions

4. **Code deep dives:**
   - Walk through auth flow (register → login → JWT generation)
   - Explain database schema relationships
   - Trace a meeting creation through all layers
   - Show middleware implementation

5. **Performance & Optimization:**
   - Know your database indices
   - Understand query patterns
   - Discuss N+1 problem and Mongoose population
   - Explain rate limiting logic

6. **Testing:**
   - Know what edge cases you tested
   - Discuss how you validate inputs
   - Show error handling patterns

---

## 13. POTENTIAL FOLLOW-UP QUESTIONS

1. **Feature Extensions:**
   - "How would you add recurring meetings?"
   - "How would you handle timezone conversions?"
   - "How would you implement meeting cancellations?"
   - "How would you add video recording?"

2. **Technical Depth:**
   - "How would you migrate from MongoDB to PostgreSQL?"
   - "How would you implement real-time notifications (WebSockets)?"
   - "How would you add search functionality for meetings?"
   - "How would you handle concurrent meeting updates?"

3. **Performance:**
   - "What's the largest number of participants you tested?"
   - "How would you cache meeting suggestions?"
   - "How would you handle slow database queries?"
   - "What's your database indexing strategy?"

4. **Security & Compliance:**
   - "How would you implement two-factor authentication?"
   - "How would you handle GDPR data deletion requests?"
   - "How would you audit user actions?"
   - "How would you prevent meeting hijacking?"

5. **Operations:**
   - "How would you monitor production issues?"
   - "How would you set up automated backups?"
   - "How would you do zero-downtime deployments?"
   - "How would you handle sudden traffic spikes?"

6. **Design Patterns:**
   - "Where would you use the Factory pattern?"
   - "Could you use the Observer pattern for notifications?"
   - "How would you implement the Strategy pattern for different scheduling algorithms?"

---

## 14. ELEVATOR PITCH (30 SECONDS)

"I built Smart Scheduler, a full-stack meeting coordination app. The core challenge was efficiently finding optimal meeting times across multiple schedules. I implemented a sweep line algorithm (O(n log n) complexity) that handles complex overlapping availability windows. The frontend is React + TypeScript for type safety, backend is Node/Express with MongoDB, and it integrates Google Calendar for Meet link generation. The app handles authentication with JWT, rate limiting for security, and real-time notifications. I deployed it on Netlify and Render with automated CI/CD."

---

## 15. PROJECT WALKTHROUGH SCRIPT

### Part 1: Architecture Overview (2 min)
"Let me walk you through the architecture. We have a React frontend built with Vite and Tailwind, a Node/Express backend with MongoDB, and Google Calendar integration. The key insight is the sweep line algorithm that finds meeting times efficiently."

### Part 2: User Flow (2 min)
"Here's how a typical workflow goes: A user registers, adds friends, then creates a meeting. All invitees get notifications and submit their available time slots. The algorithm analyzes all submissions and suggests the top meeting times. The host picks one, and we generate a Google Meet link automatically."

### Part 3: Core Algorithm (3 min)
"The sweep line algorithm is the heart of this project. Instead of checking every possible minute combination (O(n²)), we create events for each start/end time, sort them, and track which participants are active in each interval. This runs in O(n log n) time."

### Part 4: Key Features (2 min)
- "Secure authentication with JWT and bcrypt"
- "Rate limiting to prevent brute force"
- "Real-time notifications"
- "Google Meet integration"
- "Friend management system"

### Part 5: Lessons Learned (1 min)
- Importance of good database design
- How to handle complex state transitions
- Balancing features with simplicity
- Security best practices

---

## 16. DEBUGGING & TROUBLESHOOTING QUESTIONS

"I see some issues in the test suite. Let me show you how I would debug them..."

Common issues you might encounter:
- "The sweep line algorithm returns no suggestions" → Check if host submitted availability
- "Google Meet link generation fails" → Check credentials, OAuth token refresh
- "Notifications not appearing" → Check database queries, permissions
- "Race conditions in concurrent updates" → Add database transactions/locks
- "Performance degradation with many participants" → Add database indices, caching

---

## 17. CODE QUALITY & BEST PRACTICES

What you're doing right:
- ✅ TypeScript for type safety
- ✅ Input validation with express-validator
- ✅ Error handling with try-catch
- ✅ Structured logging
- ✅ Security headers (Helmet)
- ✅ CORS configuration
- ✅ Rate limiting

Areas for improvement:
- 📌 Add more comprehensive unit tests
- 📌 Implement integration tests with test database
- 📌 Add API documentation (Swagger/OpenAPI)
- 📌 Implement transaction rollback for failed operations
- 📌 Add performance monitoring (New Relic, Datadog)
- 📌 Implement GraphQL for complex queries
- 📌 Add caching layer (Redis)

---

## 18. FINAL TIPS

1. **Speak clearly about the problem you solved** → Not just a list of features
2. **Show, don't tell** → Be ready to trace code, show architecture diagrams
3. **Discuss trade-offs** → Show you think about different approaches
4. **Be honest about limitations** → Shows maturity
5. **Ask good questions** → "How would you handle X?" shows you think strategically
6. **Be enthusiastic** → This project is cool! Let that energy show
7. **Focus on impact** → How does this solve a real user problem?

---

**Good luck with your interview! You've built something substantial here. 🚀**
