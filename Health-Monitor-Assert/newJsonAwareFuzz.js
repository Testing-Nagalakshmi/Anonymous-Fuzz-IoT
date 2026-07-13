const mqtt = require('mqtt');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { CLOSING } = require('ws');

const client = mqtt.connect('mqtt://localhost:1883');

let connected = false;
let currentTestCaseId = 0;
const pendingCoverage = {}; // { testCaseId: { temperature, humidity, ac, ..., _timeoutStarted: true } }
const latestCoverage = {};  // Stores last known coverage for each source

client.on('connect', () => {
    console.log('Fuzzer connected to MQTT broker');
    connected = true;
    client.subscribe('coverage/#'); 
});

client.on('message', (topic, message) => {
    try {
        const parsed = JSON.parse(message.toString());
        const { testCaseId, coverage } = parsed;
        if (typeof testCaseId === 'undefined' || !coverage) return;

        if (!pendingCoverage[testCaseId]) {
            pendingCoverage[testCaseId] = {};
        }
        const data = pendingCoverage[testCaseId];
        const source = topic.split('/')[1]; // 'temperature', 'humidity', 'ac', etc.
        data[source] = coverage;

        // Start timeout once
        if (!data._timeoutStarted) {
            data._timeoutStarted = true;
            setTimeout(() => {
                mergeAndCleanup(testCaseId);
            }, 3000);
        }

    } catch (e) {
        console.error(`Error parsing message from ${topic}:`, e.message);
    }
});

function mergeAndCleanup(testCaseId) {
    const data = pendingCoverage[testCaseId];
    if (!data) return;

    const { _timeoutStarted, ...currentCoverages } = data;
    const sourcesThisCase = Object.keys(currentCoverages);

    if (sourcesThisCase.length === 0) {
        console.log(`No coverage received for testCaseId ${testCaseId}`);
        delete pendingCoverage[testCaseId];
        return;
    }

    // Merge logic: use new if available, else use stored latest
    const coverageMap = createCoverageMap({});
    const allSources = new Set([...Object.keys(latestCoverage), ...sourcesThisCase]);

    for (const source of allSources) {
        let coverageToMerge;
        if (currentCoverages[source]) {
            // Use new coverage and update latest
            coverageToMerge = JSON.parse(JSON.stringify(currentCoverages[source]));
            latestCoverage[source] = coverageToMerge;
        } else if (latestCoverage[source]) {
            // Use last known coverage if current test case didn't provide it
            coverageToMerge = JSON.parse(JSON.stringify(latestCoverage[source]));
        }

        if (coverageToMerge) {
            coverageMap.merge(coverageToMerge);
        }
    }

    global.__coverage__ = coverageMap.toJSON();
    console.log(`Merged [${Array.from(allSources).join(', ')}] for testCaseId ${testCaseId}`);

    delete pendingCoverage[testCaseId];
}

// *** THIS IS THE CORRECT FUZZ FUNCTION FOR JSON ***
function fuzz(data) {
  if (!Buffer.isBuffer(data) || data.length === 0 || !connected) return;

  const testCaseId = currentTestCaseId++;

  let obj = null;
  try {
    obj = JSON.parse(data.toString());
  } catch {
    // ❌ Bad JSON → still send a minimal event to hit controller error paths
    client.publish(
      "aws/things/SmartHeartRateMonitor/shadow/update/documents",
      JSON.stringify({ testCaseId })
    );
    return;
  }

  const heartRate = obj.heartRate ??
    [45, 80, 140][Math.floor(Math.random() * 3)];   // low | normal | high

  const batteryLevel = obj.batteryLevel ??
    [null, "bad", 88][Math.floor(Math.random() * 3)]; // missing | invalid | valid

  // ❗ Required for multi-file merging
  pendingCoverage[testCaseId] = {};

  const payload = {
    testCaseId,
    state: {
      reported: {
        heartRate,
        batteryLevel
      }
    },
    metadata: {
      reported: {
        heartRate: { timestamp: Date.now() },
        batteryLevel: { timestamp: Date.now() }
      }
    },
    version: Math.floor(Math.random() * 1000),
    timestamp: Date.now()
  };

  client.publish(
    "aws/things/SmartHeartRateMonitor/shadow/update/documents",
    JSON.stringify(payload)
  );

  // Shadow delta → exercise additional controller branches
  client.publish(
    "aws/things/SmartHeartRateMonitor/shadow/update/delta",
    JSON.stringify({
      testCaseId,
      state: {
        heartRate: heartRate + Math.floor(Math.random() * 20),
        batteryLevel: typeof batteryLevel === "number"
          ? batteryLevel - 5
          : batteryLevel
      }
    })
  );

  // Shadow get path → exercises controller again
  client.publish(
    "aws/things/SmartHeartRateMonitor/shadow/get",
    JSON.stringify({ testCaseId })
  );
}
module.exports = { fuzz };