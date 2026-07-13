const mqtt = require("mqtt");
const { lambdaTemperature } = require("./lambdaTemperature");
const { lambdaHumidity } = require("./lambdaHumidity");
const { lambdaAC } = require("./lambdaAC");

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
    console.log("MQTT client connected");
    client.subscribe("sensor/temperature");
    client.subscribe("sensor/humidity");
    client.subscribe("control/ac");
});

client.on("message", (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        if (topic === "sensor/temperature") {
            lambdaTemperature(data);
        } else if (topic === "sensor/humidity") {
            lambdaHumidity(data);
        } else if (topic === "control/ac") {
            lambdaAC(data);
        }

    } catch (err) {
        console.error("⚠️ Assertion triggered:", err.message);
        client.publish("critical/inputs", message.toString());
    }
});
