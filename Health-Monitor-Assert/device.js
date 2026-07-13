// device.js (MQTT publisher)
const mqtt = require("mqtt");
const fs = require("./shadow.json");

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("SmartHeartRateMonitor connected");

  setInterval(() => {
    const heartRate = Math.floor(50 + Math.random() * 80);
    const battery = Math.floor(10 + Math.random() * 90);

    const shadowUpdate = {
      state: {
        reported: {
          heartRate,
          batteryLevel: battery
        }
      }
    };

    client.publish(
      "aws/things/SmartHeartRateMonitor/shadow/update/documents",
      JSON.stringify(shadowUpdate)
    );

    console.log("Published:", shadowUpdate);

  }, 3000);
});
