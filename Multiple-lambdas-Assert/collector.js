const mqtt = require("mqtt");
const fs = require("fs");

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
    console.log("Collector connected");
    client.subscribe("critical/inputs");
});

client.on("message", (topic, message) => {
    console.log("⚠️ Critical input received:", message.toString());
    fs.appendFileSync("critical_inputs.log", message.toString() + "\n");
});
