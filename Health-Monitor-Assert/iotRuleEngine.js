const mqtt = require("mqtt");
const lambdaVitals = require("./lambdaVitals");
const lambdaInventory = require("./lambdaInventory");

function safeJSON(str) {
  try { return JSON.parse(str); }
  catch { return null; }
}

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("Rule Engine Connected");
  client.subscribe("aws/things/SmartHeartRateMonitor/shadow/update/documents");
  client.subscribe("aws/things/SmartHeartRateMonitor/shadow/update/delta");
  client.subscribe("aws/things/SmartHeartRateMonitor/shadow/get");
});

client.on("message", async (_, message) => {
  const event = safeJSON(message.toString());
console.log("Event received:", event);

  if (!event) return;

  if (!event.testCaseId) event.testCaseId = Math.floor(Math.random() * 1e6);

  try {
  console.log("Passing to Vitals Lambda...");
  await lambdaVitals.handler(event, client);
  console.log("Passing to Inventory Lambda...");
  await lambdaInventory.handler(event);
  } 

catch (err) {
  if (err.name === "AssertionError") {
    console.error("⚠️ Assertion triggered:", err.message);
    client.publish("critical/inputs", JSON.stringify({
      testCaseId: event.testCaseId,
      state: event.state,
      message: err.message,
      timestamp: Date.now()
    }));
  } else {
    console.error("Handler Error:", err);
  }
}

  if (global.__coverage__) {
    client.publish(
      "coverage/controller",
      JSON.stringify({ testCaseId: event.testCaseId, coverage: global.__coverage__ })
    );
  }
});
