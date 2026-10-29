
// GLOBAL VARIABLES in all codes


let currentUnit = 'celsius';
let currentTheme = 'theme-dark'; 
let lat = -6.2088; 
let lon = 106.8456;
let currentCityName = "Jakarta";
let globalHourlyData = null;
let globalDailyData = null;
let isLoginMode = true;

let historyChartInstance = null;
let mapInstance = null;

// DOM Elements
const views = document.querySelectorAll('.view-section');
const navLinks = {
    dashboard: document.getElementById('nav-dashboard'),
    map: document.getElementById('nav-map'),
    calendar: document.getElementById('nav-calendar'),
    settings: document.getElementById('nav-settings')
};
const searchContainer = document.getElementById('search-container');

// 1. THEME TOGGLE LOGIC
const themeBtn = document.getElementById('theme-btn');

function applyTheme(theme) {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(theme);
    themeBtn.textContent = (theme === 'theme-light') ? '🌙 Dark Mode' : '☀️ Light Mode';
    localStorage.setItem('skypulse_theme', theme);
}

themeBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'theme-dark' ? 'theme-light' : 'theme-dark';
    applyTheme(currentTheme);
});

// 2. NAVIGATION LOGIC
function switchView(viewName) {
    views.forEach(v => v.style.display = 'none');
    document.getElementById(`view-${viewName}`).style.display = 'block';
    
    Object.values(navLinks).forEach(link => link.classList.remove('active'));
    if(navLinks[viewName]) navLinks[viewName].classList.add('active');

    if (viewName === 'dashboard') searchContainer.style.display = 'flex';
    else searchContainer.style.display = 'none';

    if (viewName === 'map') {
        initMap();
        setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 200);
    }
    if (viewName === 'calendar' && globalDailyData) renderCalendar();
}

navLinks.dashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
navLinks.map.addEventListener('click', (e) => { e.preventDefault(); switchView('map'); });
navLinks.calendar.addEventListener('click', (e) => { e.preventDefault(); switchView('calendar'); });
navLinks.settings.addEventListener('click', (e) => { e.preventDefault(); switchView('settings'); });

// 3. MAP LOGIC
function initMap() {
    if (mapInstance) return;
    
    // Atur maxZoom ke 10 agar map tidak terlalu dekat (base map aman)
    mapInstance = L.map('map', { maxZoom: 10 }).setView([lat, lon], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapInstance);
    
    L.marker([lat, lon]).addTo(mapInstance).bindPopup(`<b>${currentCityName}</b>`).openPopup();
    
    // FIX: Tambahkan maxNativeZoom agar Leaflet tidak request gambar di atas zoom 6/7
    L.tileLayer('https://tilecache.rainviewer.com/v2/radar/nowcast_0/{z}/{x}/{y}/2/1_1.png', { 
        opacity: 0.6, 
        zIndex: 10,
        maxNativeZoom: 6, // Batas maksimal gambar radar yang didukung gratis
        maxZoom: 10 // Leaflet akan zoom gambar radar (blur) hingga level 10
    }).addTo(mapInstance);
}

// 4. CALENDAR LOGIC 
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        if (!globalDailyData.time[i]) break;
        const date = new Date(globalDailyData.time[i]);
        // FIX replaced 'id-ID'  to 'en-US'
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const cond = getWeatherCondition(globalDailyData.weather_code[i]);
        
        container.innerHTML += `
            <div class="cal-day-card">
                <h4 style="color:var(--text-muted)">${dayName}</h4>
                <p style="font-size:12px; color:var(--text-muted);">${date.toLocaleDateString('en-US')}</p>
                <div class="icon">${cond.icon}</div>
                <div class="temp" style="font-weight:bold;">${Math.round(globalDailyData.temperature_2m_max[i])}° / ${Math.round(globalDailyData.temperature_2m_min[i])}°</div>
            </div>
        `;
    }
}

// 5. AUTH LOGIC 
const userBtn = document.getElementById('user-btn');
const authModal = document.getElementById('auth-modal');
const closeAuth = document.getElementById('close-auth');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchBtn = document.getElementById('auth-switch-btn');

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('skypulse_current_user'));
    userBtn.textContent = user ? `👤 ${user.username}` : `👤 User Name`;
}

userBtn.addEventListener('click', () => {
    const user = JSON.parse(localStorage.getItem('skypulse_current_user'));
    if (user) {
        if (confirm("Logout?")) { localStorage.removeItem('skypulse_current_user'); checkAuth(); }
    } else {
        authModal.style.display = 'flex';
    }
});

closeAuth.addEventListener('click', () => authModal.style.display = 'none');

authSwitchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? "Login to SkyPulse" : "Create an Account";
    authSubmitBtn.textContent = isLoginMode ? "Login" : "Register";
});

authSubmitBtn.addEventListener('click', () => {
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value.trim();
    if (!u || !p) return alert("Isi semua field!");

    let users = JSON.parse(localStorage.getItem('skypulse_users')) || [];
    if (isLoginMode) {
        const found = users.find(x => x.username === u && x.password === p);
        if (found) {
            localStorage.setItem('skypulse_current_user', JSON.stringify(found));
            authModal.style.display = 'none'; checkAuth(); alert("Login Berhasil!");
        } else alert("Username/Password salah!");
    } else {
        if (users.find(x => x.username === u)) alert("Username sudah dipakai!");
        else {
            users.push({ username: u, password: p });
            localStorage.setItem('skypulse_users', JSON.stringify(users));
            alert("Registrasi Berhasil! Silakan Login."); authSwitchBtn.click();
        }
    }
});

// 6. WEATHER API and RENDER LOGIC
function getWeatherCondition(code) {
    if (code === 0) return { text: 'Clear', icon: '☀️' };
    if (code >= 1 && code <= 3) return { text: 'Cloudy', icon: '🌤️' };
    if (code >= 45 && code <= 48) return { text: 'Fog', icon: '🌫️' };
    if (code >= 51 && code <= 67) return { text: 'Rain', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { text: 'Snow', icon: '❄️' };
    if (code >= 95) return { text: 'Thunderstorm', icon: '⛈️' };
    return { text: 'Unknown', icon: '🌥️' };
}

async function loadWeather(latitude, longitude, cityName = 'My Location') {
    document.getElementById('error-box').style.display = 'none';
    lat = latitude; lon = longitude; currentCityName = cityName;

    try {
        const unitParam = currentUnit === 'celsius' ? 'celsius' : 'fahrenheit';
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,dew_point_2m,visibility,pressure_msl,cloud_cover&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto&temperature_unit=${unitParam}`;
        const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,us_aqi`;
        const historyUrl = `https://archive-api.open-meteo.com/v1/era5?latitude=${lat}&longitude=${lon}&start_date=2021-01-01&end_date=2021-12-31&hourly=temperature_2m&temperature_unit=${unitParam}`;

        const [wRes, aRes, hRes] = await Promise.all([ fetch(weatherUrl), fetch(airUrl), fetch(historyUrl) ]);
        const wData = await wRes.json();
        const aData = await aRes.json();
        const hData = await hRes.json();

        globalHourlyData = wData.hourly;
        globalDailyData = wData.daily;

        // Update UI
        const cur = wData.current;
        const daily = wData.daily;
        const cond = getWeatherCondition(cur.weather_code);
        
        document.getElementById('city-name').textContent = cityName;
        document.getElementById('current-date').textContent = new Date(cur.time).toDateString();
        document.getElementById('current-temp').textContent = `${Math.round(cur.temperature_2m)}°`;
        document.getElementById('weather-desc').textContent = cond.text;
        document.getElementById('main-icon').textContent = cond.icon;
        document.getElementById('feels-like').textContent = `${Math.round(cur.apparent_temperature)}°`;
        document.getElementById('temp-high').textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
        document.getElementById('temp-low').textContent = `${Math.round(daily.temperature_2m_min[0])}°`;

        document.getElementById('rain-chance').textContent = `${daily.precipitation_probability_max[0] || 0}%`;
        document.getElementById('uv-index').textContent = daily.uv_index_max[0] || '0';
        document.getElementById('wind-speed').textContent = `${cur.wind_speed_10m} km/h`;
        document.getElementById('humidity').textContent = `${cur.relative_humidity_2m}%`;

        document.getElementById('dew-point').textContent = `${Math.round(cur.dew_point_2m)}°`;
        document.getElementById('visibility').textContent = `${(cur.visibility / 1000).toFixed(1)} km`;
        document.getElementById('pressure').textContent = `${Math.round(cur.pressure_msl)} hPa`;
        document.getElementById('cloud-cover').textContent = `${cur.cloud_cover}%`;

        document.getElementById('sunrise').textContent = new Date(daily.sunrise[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        document.getElementById('sunset').textContent = new Date(daily.sunset[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const diff = new Date(daily.sunset[0]) - new Date(daily.sunrise[0]);
        document.getElementById('day-length').textContent = `${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m`;

        if (aData.current) {
            const aqi = Math.round(aData.current.us_aqi);
            document.getElementById('aqi-value').textContent = aqi;
            document.getElementById('pm25').textContent = aData.current.pm2_5;
            document.getElementById('pm10').textContent = aData.current.pm10;
            
            let aqiColor = '#22c55e'; let aqiText = 'Good';
            if (aqi > 50) { aqiColor = '#eab308'; aqiText = 'Moderate'; }
            if (aqi > 100) { aqiColor = '#f97316'; aqiText = 'Unhealthy'; }
            if (aqi > 150) { aqiColor = '#ef4444'; aqiText = 'Hazardous'; }
            
            document.getElementById('aqi-circle').style.borderColor = aqiColor;
            document.getElementById('aqi-status').style.color = aqiColor;
            document.getElementById('aqi-status').textContent = aqiText;
        }

        // Dynamics Background
        document.body.classList.remove('weather-default', 'weather-sunny', 'weather-rainy', 'weather-night', 'weather-cloudy');
        if (!cur.is_day) document.body.classList.add('weather-night');
        else if (cur.weather_code === 0) document.body.classList.add('weather-sunny');
        else if (cur.weather_code >= 51 && cur.weather_code <= 67) document.body.classList.add('weather-rainy');
        else document.body.classList.add('weather-cloudy');

        renderHourlyScroll(wData.hourly);
        renderDailyList(wData.daily);
        drawHistoryChart(hData.hourly);

        if (mapInstance) {
            mapInstance.setView([lat, lon], 6);
            mapInstance.eachLayer((layer) => { if (layer instanceof L.Marker) mapInstance.removeLayer(layer); });
            L.marker([lat, lon]).addTo(mapInstance).bindPopup(`<b>${cityName}</b>`).openPopup();
        }

        localStorage.setItem('skypulse_last_city', JSON.stringify({ lat, lon, name: cityName }));

    } catch (err) {
        console.error(err);
        document.getElementById('error-box').textContent = 'Gagal memuat data. Cek koneksi internet.';
        document.getElementById('error-box').style.display = 'block';
    }
}

function renderHourlyScroll(hourlyData) {
    const container = document.getElementById('hourly-container');
    container.innerHTML = '';
    const now = new Date();
    let startIndex = hourlyData.time.findIndex(t => new Date(t) >= now);
    if (startIndex === -1) startIndex = 0;

    for (let i = startIndex; i < startIndex + 12; i++) {
        if (!hourlyData.time[i]) break;
        const cond = getWeatherCondition(hourlyData.weather_code[i]);
        container.innerHTML += `
            <div class="hour-item">
                <span class="time">${new Date(hourlyData.time[i]).getHours()}:00</span>
                <span class="icon">${cond.icon}</span>
                <span class="temp">${Math.round(hourlyData.temperature_2m[i])}°</span>
            </div>
        `;
    }
}

function renderDailyList(dailyData) {
    const container = document.getElementById('daily-list-container');
    container.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        if (!dailyData.time[i]) break;
        const date = new Date(dailyData.time[i]);
        const cond = getWeatherCondition(dailyData.weather_code[i]);
        
        const row = document.createElement('div');
        row.className = 'day-row';
        row.innerHTML = `
            <span class="day-name">${i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span class="icon">${cond.icon}</span>
            <div class="day-temps"><span>${Math.round(dailyData.temperature_2m_max[i])}°</span><span>${Math.round(dailyData.temperature_2m_min[i])}°</span></div>
        `;

        row.addEventListener('click', () => {
            document.getElementById('modal-date').textContent = date.toDateString();
            document.getElementById('modal-max').textContent = Math.round(dailyData.temperature_2m_max[i]) + '°';
            document.getElementById('modal-min').textContent = Math.round(dailyData.temperature_2m_min[i]) + '°';
            
            const hList = document.getElementById('modal-hourly-list');
            hList.innerHTML = '';
            const targetStr = dailyData.time[i];
            for (let j = 0; j < globalHourlyData.time.length; j++) {
                if (globalHourlyData.time[j].startsWith(targetStr)) {
                    hList.innerHTML += `<div class="hourly-box"><div>${new Date(globalHourlyData.time[j]).getHours()}:00</div><div style="font-weight:bold; margin-top:5px;">${Math.round(globalHourlyData.temperature_2m[j])}°</div></div>`;
                }
            }
            document.getElementById('detail-modal').style.display = 'flex';
        });
        container.appendChild(row);
    }
}

function drawHistoryChart(historyData) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    const temps = historyData.temperature_2m.filter((_, i) => i % 500 === 0); 
    
    if (historyChartInstance) historyChartInstance.destroy();
    historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: temps.map((_, i) => i), datasets: [{ data: temps, borderColor: 'var(--accent)', tension: 0.4, pointRadius: 0, fill: true, backgroundColor: 'rgba(168, 85, 247, 0.1)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

document.getElementById('close-modal').addEventListener('click', () => document.getElementById('detail-modal').style.display = 'none');

// 7. SEARCH LOGIC 
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const suggestionsBox = document.getElementById('suggestions');

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const q = e.target.value.trim();
    if (q.length < 3) { suggestionsBox.style.display = 'none'; return; }

    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=5&language=en&format=json`);
            const data = await res.json();
            suggestionsBox.innerHTML = '';
            if (data.results) {
                data.results.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = `${c.name}, ${c.country}`;
                    div.onclick = () => {
                        suggestionsBox.style.display = 'none';
                        searchInput.value = c.name;
                        loadWeather(c.latitude, c.longitude, c.name);
                    };
                    suggestionsBox.appendChild(div);
                });
                suggestionsBox.style.display = 'block';
            }
        } catch (e) { console.log(e); }
    }, 500);
});

searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (q) {
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`)
            .then(r => r.json()).then(d => {
                if(d.results) loadWeather(d.results[0].latitude, d.results[0].longitude, d.results[0].name);
                else alert('City not found');
            });
    }
});

// 8. INIT 
document.getElementById('setting-unit').addEventListener('change', (e) => {
    currentUnit = e.target.value;
    loadWeather(lat, lon, currentCityName);
});

document.getElementById('btn-reset').addEventListener('click', () => {
    if(confirm("Reset all data?")) { localStorage.clear(); location.reload(); }
});

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('active');
});

// close sidebar click menu in the mobile
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 600) {
            document.querySelector('.sidebar').classList.remove('active');
        }
    });
});

window.addEventListener('load', () => {
    currentTheme = localStorage.getItem('skypulse_theme') || 'theme-dark';
    applyTheme(currentTheme);

    checkAuth();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(e => console.log(e));

    const saved = localStorage.getItem('skypulse_last_city');
    if (saved) {
        const p = JSON.parse(saved);
        loadWeather(p.lat, p.lon, p.name);
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude, 'My Location'),
            () => loadWeather(lat, lon, 'Jakarta')
        );
    } else {
        loadWeather(lat, lon, 'Jakarta');
    }
});