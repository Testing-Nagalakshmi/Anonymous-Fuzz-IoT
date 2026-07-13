const assert = require("assert");

exports.handler = async (event, mqttClient) => {
console.log("Vitals Lambda received:", event);
  const heartRate = event?.state?.reported?.heartRate;
  if (!heartRate) return;

  // First-level check
  if (heartRate < 60 || heartRate > 100) {
    const msg = `⚠ ALERT: Abnormal heart rate detected: ${heartRate} bpm`;
    console.log(msg);
    mqttClient.publish("alerts/medical/heartRate", msg);

    // Condition satisfied → now assertion in next lambda will be reachable
    event._abnormalHeartRate = true;
  }

  // Coverage reporting
  if (global.__coverage__) {
    mqttClient.publish(
      "coverage/vitals",
      JSON.stringify({ testCaseId: event.testCaseId, coverage: global.__coverage__ })
    );
  }
};
