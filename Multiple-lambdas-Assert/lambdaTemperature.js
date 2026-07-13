const assert = require("assert");

function lambdaTemperature(data) {
    // Assertion: temperature must not exceed 50°C
    assert(data.value <= 50, `Temperature assertion failed: ${data.value}°C > threshold`);
    return { sensorId: data.sensorId, value: data.value };
}

module.exports = { lambdaTemperature };

