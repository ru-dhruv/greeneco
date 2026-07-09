<div align="center">
  
# 🌿 GreenEco

**The Social Network for Environmental Action**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)

[**View Live Demo**](https://greeneco-navy.vercel.app) 

</div>

---

## 📖 About the Project

**GreenEco** is a gamified, social-impact web application—often described as a *"Strava for Eco-Actions"*. 

It was built to encourage and reward environmental consciousness by allowing users to log real-world activities (such as planting trees, cycling, or organizing cleanup drives) and share their impact with a community. 

By blending **live GPS route tracking, social networking, and gamification**, GreenEco turns individual sustainability efforts into a powerful, community-driven movement.

> 🤖 *Note: This project was independently developed with the assistance of Artificial Intelligence to refine the codebase and architecture.*

---

## ✨ Key Features

### 🎮 Gamification & Action Logging
- **14 Eco-Action Types:** Log everything from recycling to vegan meals.
- **Green Credits:** Earn credits for every action to level up your global rank (from *Seedling* to *Captain Earth*).
- **Dynamic Rewards:** Maintain daily action streaks for credit multipliers, unlock digital badges like "First Tree 🌱", and experience satisfying confetti micro-animations upon successful logs.

### 📍 Geospatial & Map Integration
- **Live GPS Tracking:** Powered by `Turf.js`, users can physically track their routes while cycling or walking. The app calculates exact distances and saves them as LineString geospatial data.
- **Air Quality Map:** An interactive, Leaflet-powered map that fetches real-time Air Quality Index (AQI) data via the WAQI API. It categorizes your local area into distinct zones (from *Dead Zones 💀* to *Biodiversity Zones 🦋*).

### 👥 Social Community
- **Global Feed:** View a scrolling feed of photo-verified eco-actions from environmentalists worldwide.
- **Follow System:** Build your network by following top users.
- **Clubs & Challenges:** Create localized Eco-Clubs, join community challenges, and track collective progress towards sustainability goals.

---

## 🏗️ Architecture & Tech Stack

GreenEco is built using a modern, highly responsive Server-Side Rendered (SSR) architecture.

- **Frontend:** [Next.js 14](https://nextjs.org/) (App Router) & React 18
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + Custom CSS Variable Design System
- **Database:** [Firebase Cloud Firestore](https://firebase.google.com/docs/firestore) (NoSQL)
- **Authentication:** [Firebase Auth](https://firebase.google.com/docs/auth) (Google OAuth + Email/Password)
- **Media CDN:** [Cloudinary](https://cloudinary.com/) (Optimized image uploads)
- **Mapping:** [Leaflet](https://leafletjs.com/), [React-Leaflet](https://react-leaflet.js.org/), WAQI API, Nominatim
- **Deployment:** [Vercel](https://vercel.com/) (Frontend)

---

## 🚀 Quick Start (Local Setup)

Want to run the project locally? Follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/ru-dhruv/greeneco.git
cd greeneco
```

### 2. Install Dependencies
Because of React 18 map library peer dependencies, please use the `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

### 3. Environment Variables (Optional)
The project utilizes public-facing frontend keys for Firebase and Cloudinary which are included in the source code by design. No `.env` configuration is strictly required to run the app in development mode!

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🌍 Contributing

We welcome contributions that make GreenEco better! If you'd like to help:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. Feel free to use this code for your own educational projects!
