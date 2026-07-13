const assert = require("assert");
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:1883");

exports.handler = async (event) => {
  console.log("Inventory Lambda received:", event);

  const batteryLevel = event?.state?.reported?.batteryLevel;

  if (typeof batteryLevel !== "number") {
    console.log("Inventory Lambda: Invalid batteryLevel");
    return;
  }

  if (event._abnormalHeartRate) {
    assert(
      batteryLevel > 20,
      `Critical assertion: Battery too low (${batteryLevel}%) during abnormal heart rate`
    );
  }

  if (global.__coverage__) {
    client.publish(
      "coverage/inventory",
      JSON.stringify({ testCaseId: event.testCaseId, coverage: global.__coverage__ })
    );
  }
};

