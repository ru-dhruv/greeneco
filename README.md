# 🌿 GreenEco

**GreenEco** is a gamified, social-impact web app that acts as a "Strava for Eco-Actions." It encourages users to log environmental activities (like planting trees or cycling) to earn "Green Credits." These credits allow users to rank up, build daily streaks, and unlock digital badges. 

The platform is highly social, featuring a live global feed, community Clubs, Challenges, and an interactive Air Quality Map to visualize local pollution levels. Built with Next.js, Tailwind, and Firebase, the app blends social networking with live GPS route tracking. 

*This project was independently developed, with a little bit of assistance from AI to help refine the code.*

---

## ✨ Features

- **Action Logging & Gamification:** Log 14 different types of environmental actions, upload proof photos, earn Green Credits, and level up your rank (from *Seedling* to *Captain Earth*).
- **GPS Route Tracking:** Powered by `Turf.js`, record your live physical routes when cycling or walking. The app calculates exact distances and saves them as geospatial data.
- **Interactive Air Quality Map:** A dynamic Leaflet map that fetches real-time Air Quality Index (AQI) data using the WAQI API, categorizing areas from "Dead Zones" to "Biodiversity Zones."
- **Social Feed:** View a live feed of recent eco-actions from other users and interact with the community.
- **Community Clubs & Challenges:** Create or join eco-clubs, and participate in community challenges to hit collective sustainability targets.
- **Dynamic Confetti Rewards:** Satisfying micro-animations trigger when you successfully log an eco-action to keep the experience highly engaging.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router, Server-Side Rendering), React 18
- **Styling:** Tailwind CSS + Custom CSS Variables Design System
- **Database:** Firebase Cloud Firestore (NoSQL)
- **Authentication:** Firebase Auth (Google OAuth + Email)
- **Media Storage:** Cloudinary
- **Maps & Geolocation:** Leaflet, React-Leaflet, Turf.js, WAQI API, Nominatim
- **Deployment:** Vercel (Frontend)

---

## 🚀 Quick Start (Local Development)

1. **Clone the repository and install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open the app:**
   Navigate to `http://localhost:3000` in your web browser.
