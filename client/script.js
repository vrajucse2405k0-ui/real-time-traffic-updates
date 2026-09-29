const TOMTOM_API_KEY = "dRw4k40Rfc2CFuXvz8E9zI8OGm7vVrGc";

let map, userMarker, routeLayer;
let userLat, userLng;

let destinationCoords = null;
let instructions = [];
let currentStep = 0;
let speaking = false;

window.onload = () => {
    map = L.map("map").setView([17.385, 78.4867], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    startLiveTracking();
};

// 📍 LIVE GPS
function startLiveTracking() {
    navigator.geolocation.watchPosition(pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;

        if (userMarker) map.removeLayer(userMarker);

        userMarker = L.marker([userLat, userLng]).addTo(map);

        map.setView([userLat, userLng], 17);

        checkNavigation();
    }, err => console.log(err), {
        enableHighAccuracy: true
    });
}

// 🔍 AUTOCOMPLETE
async function suggestPlaces() {
    const q = document.getElementById("end").value;

    if (q.length < 3) return;

    const res = await fetch(`https://api.tomtom.com/search/2/search/${q}.json?key=${TOMTOM_API_KEY}`);
    const data = await res.json();

    const box = document.getElementById("suggestions");
    box.innerHTML = "";

    data.results.forEach(p => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.innerText = p.address.freeformAddress;

        div.onclick = () => {
            document.getElementById("end").value = div.innerText;
            box.innerHTML = "";
        };

        box.appendChild(div);
    });
}

// 📍 COORDS
async function getCoordinates(place) {
    const res = await fetch(`https://api.tomtom.com/search/2/geocode/${place}.json?key=${TOMTOM_API_KEY}`);
    const data = await res.json();
    return data.results[0]?.position;
}

// 🚗 START ROUTE
async function getRoute() {
    const dest = document.getElementById("end").value;
    destinationCoords = await getCoordinates(dest);
    drawRoute();
}

// 🚗 DRAW ROUTE
async function drawRoute() {
    const res = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${userLat},${userLng}:${destinationCoords.lat},${destinationCoords.lon}/json?key=${TOMTOM_API_KEY}&traffic=true`);
    const data = await res.json();

    const route = data.routes[0];

    const coords = route.legs[0].points.map(p => [p.latitude, p.longitude]);

    if (routeLayer) map.removeLayer(routeLayer);

    routeLayer = L.polyline(coords, { color: "blue", weight: 6 }).addTo(map);

    instructions = route.guidance.instructions.map(step => ({
        text: step.message,
        lat: step.point.latitude,
        lng: step.point.longitude,
        announced: false
    }));

    currentStep = 0;
}

// 🔊 SPEAK
function speak(text) {
    if (speaking) return;

    speaking = true;
    const u = new SpeechSynthesisUtterance(text);

    u.onend = () => speaking = false;

    speechSynthesis.speak(u);
}

// 📏 DIST
function formatDistance(m) {
    return m < 1000 ? Math.round(m) + "m" : (m/1000).toFixed(1) + "km";
}

// 🧭 BEARING CALCULATION
function getBearing(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => r * 180 / Math.PI;

    const dLon = toRad(lon2 - lon1);

    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// 🔁 MAIN NAV LOOP
function checkNavigation() {
    if (!routeLayer || !instructions.length) return;

    instructions.forEach((step, i) => {
        const dist = map.distance([userLat, userLng], [step.lat, step.lng]);

        // 🔊 voice early
        if (dist < 200 && !step.announced) {
            speak(`In ${formatDistance(dist)}, ${step.text}`);
            step.announced = true;
        }

        // 🔊 final
        if (dist < 30 && i === currentStep) {
            speak(step.text);
            currentStep++;
        }
    });

    // 🧭 ROTATING ARROW UI
    if (currentStep < instructions.length) {
        const step = instructions[currentStep];

        const dist = map.distance([userLat, userLng], [step.lat, step.lng]);

        const bearing = getBearing(userLat, userLng, step.lat, step.lng);

        const arrow = document.getElementById("arrow");
        arrow.style.transform = `rotate(${bearing}deg)`;

        document.getElementById("navText").innerText =
            `${formatDistance(dist)} • ${step.text}`;
    }
}
function clearDestination() {
    document.getElementById("end").value = "";
    document.getElementById("suggestions").innerHTML = "";
}