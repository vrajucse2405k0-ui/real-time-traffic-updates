const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("../client"));

const server = http.createServer(app);

const io = socketIo(server, {
    cors: { origin: "*" }
});

setInterval(() => {
    const trafficData = [
        { lat: 17.3850, lon: 78.4867, level: "low" },
        { lat: 17.3950, lon: 78.4967, level: "medium" },
        { lat: 17.4050, lon: 78.4767, level: "high" }
    ];

    io.emit("trafficData", trafficData);
}, 5000);

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});