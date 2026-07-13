function lambdaAC(data) {
    if (data.action === "TURN_ON" && data.reason === "overload") {
        throw new Error(`AC assertion failed: unsafe TURN_ON due to overload`);
    }
    return { action: data.action, reason: data.reason };
}

module.exports = { lambdaAC };
