function lambdaHumidity(data) {
    if (data.value > 70) {
        throw new Error(`Humidity assertion failed: ${data.value}% > threshold`);
    }
    return { sensorId: data.sensorId, value: data.value };
}

module.exports = { lambdaHumidity };
