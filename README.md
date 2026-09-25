# Smart Scheduler

Smart Scheduler is a full-stack web application that helps users efficiently schedule meetings with friends and colleagues by finding the best overlapping time slots for all participants. It features user authentication, friend management, meeting scheduling, Google Meet integration, and real-time notifications.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [How It Works](#how-it-works)
- [API Endpoints](#api-endpoints)
- [Key Algorithms](#key-algorithms)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- User registration and login
- Add and accept friends
- Schedule meetings with friends
- Suggests best meeting times using a sweep line algorithm
- Google Meet link generation
- Real-time notifications
- Responsive, modern UI

---

## Tech Stack

**Frontend:**
- React (with Vite)
- Tailwind CSS

**Backend:**
- Node.js
- Express.js
- MongoDB (with Mongoose)
- Google APIs (for Meet/Calendar integration)
- JWT (for authentication)

---

## Project Structure

```
Scheduling Project/
  ├── client-vite/         # Frontend React app
  │   ├── src/
  │   │   ├── components/  # React components (UI)
  │   │   └── utils/       # Utility functions (e.g., auth)
  │   └── public/          # Static assets
  ├── server/              # Backend Node.js/Express app
  │   ├── models/          # Mongoose models (User, Meeting, Notification)
  │   ├── routes/          # Express route handlers (auth, notification)
  │   └── middleware/      # Express middleware (auth checks)
  └── ...                  # Config, backup, and meta files
```

---

## Setup Instructions

### Prerequisites

- Node.js (v16+ recommended)
- npm or yarn
- MongoDB instance (local or cloud, e.g., MongoDB Atlas)
- Google Cloud project with Calendar API enabled (for Meet integration)

---

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Environment variables:**
   - Create a `.env` file in the `server/` directory:
     ```
     MONGO_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     ```
   - Place your Google API credentials in `server/credentials.json`.

3. **Run the backend:**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:5000` by default.

---

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd client-vite
   npm install
   ```

2. **Run the frontend:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

## How It Works

1. **User Authentication:**  
   Users can register and log in. JWT tokens are used for session management.

2. **Friend Management:**  
   Users can search for others, send/accept friend requests, and build a network.

3. **Meeting Scheduling:**  
   - Users create meetings and invite friends.
   - Each participant submits their available time slots.
   - The backend uses a sweep line algorithm to find the best overlapping slots.

4. **Google Meet Integration:**  
   - Once a time is chosen, a Google Meet link is generated and shared.

5. **Notifications:**  
   - Users receive notifications for friend requests, meeting invites, and updates.

---

## API Endpoints

**Base URL:** `http://localhost:5000/api`

- `POST /register` — Register a new user
- `POST /login` — Log in
- `GET /users/search` — Search for users
- `POST /friends/request` — Send friend request
- `POST /friends/accept` — Accept friend request
- `POST /meetings` — Create a meeting
- `POST /meetings/:id/availability` — Submit availability for a meeting
- `GET /meetings/:id/suggest-times` — Get best meeting times (sweep line algorithm)
- `GET /notifications` — Get user notifications
- `GET /google-auth` — Start Google Calendar/Meet OAuth flow

*(See `server/routes/` for more details.)*

---

## Key Algorithms

### Sweep Line Algorithm for Meeting Scheduling

- **Purpose:** Efficiently finds the best overlapping time slots for all meeting participants.
- **How it works:**
  1. Collect all users’ available intervals.
  2. Convert intervals into "start" and "end" events.
  3. Sort events by time.
  4. Sweep through events, tracking who is available at each moment.
  5. Identify intervals where the host and at least one invitee are available for the required duration.
  6. Suggest the top 3 slots with the most overlap.

---

## Contributing

1. Fork the repo and clone it.
2. Create a new branch for your feature or bugfix.
3. Commit your changes with clear messages.
4. Push to your fork and open a pull request.

---

## License

This project is licensed under the MIT License.

---

## Contact

For questions or support, please open an issue or contact the maintainer.

---

**Enjoy scheduling smarter with Smart Scheduler!** 