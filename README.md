# Task 4: Weather Dashboard - SkyPulse

A modern, fully responsive weather dashboard that fetches real-time meteorological data from the Open-Meteo API. This project was developed as part of the Frontend Developer Internship program at Auspify Technologies.

## 🚀 Live Demo
*([Live Demo]((https://kusnadi34.github.io/task-4-Weather-Dashboard/)))*

## ✨ Features

- **Real-Time Weather Data:** Displays current temperature, "feels like" temperature, humidity, and wind speed.
- **City Search:** Search for weather conditions in any city globally using the Open-Meteo Geocoding API.
- **Forecasts:** Includes a 12-hour hourly forecast and a 7-day daily forecast.
- **PWA (Progressive Web App):** Includes a `manifest.json` and Service Worker (`sw.js`), allowing users to install the app on their mobile devices and providing basic offline caching.
- **Robust Error Handling:** Gracefully handles invalid city names or network failures with user-friendly error messages.
- **Glassmorphism UI:** A beautiful, atmospheric design featuring a dark mode gradient background and frosted glass card effects.
- **Mobile-First Design:** Seamlessly adapts from mobile phones to large desktop screens.

## 🛠 Tech Stack

- **HTML5:** Semantic structure and PWA meta tags.
- **CSS3:** Custom properties (CSS Variables), Flexbox, CSS Grid, Glassmorphism effects (`backdrop-filter`), and Media Queries.
- **Vanilla JavaScript (ES6+):**
  - **Fetch API & Async/Await:** To retrieve data from external REST APIs.
  - **JSON Parsing:** To process weather data.
  - **DOM Manipulation:** To dynamically update the UI based on API responses.
  - **Service Worker:** For offline capabilities and caching.
- **API:** [Open-Meteo API](https://open-meteo.com/) (Weather and Geocoding).

## 📁 Folder Structure

```text
task-4-Weather-Dashboard/
├── assets/
│   └── icon.png          # App icon for PWA
├── index.html            # Main HTML structure
├── manifest.json         # PWA configuration file
├── script.js             # API fetching and UI logic
├── style.css             # Styling and glassmorphism design
└── sw.js                 # Service Worker for offline caching
