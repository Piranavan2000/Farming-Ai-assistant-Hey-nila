let systemStats = {
    startTime: Date.now(),
    totalPackets: 0,
    successfulPackets: 0,
    failedPackets: 0,
    lastSeen: null,
    filterHits: 0, // Count of 65535 or invalid readings caught
    recentLogs: []
};

exports.updateSystemHealth = (success, isFiltered = false, rawPayload = '') => {
    systemStats.totalPackets++;
    if (success) systemStats.successfulPackets++;
    else systemStats.failedPackets++;
    
    if (isFiltered) systemStats.filterHits++;
    
    systemStats.lastSeen = new Date();
    
    // Keep only last 10 logs
    systemStats.recentLogs.unshift({
        timestamp: new Date().toLocaleTimeString(),
        status: success ? 'SUCCESS' : 'ERROR',
        payload: rawPayload.substring(0, 50) + (rawPayload.length > 50 ? '...' : '')
    });
    if (systemStats.recentLogs.length > 10) systemStats.recentLogs.pop();
};

exports.getSystemStatus = (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - systemStats.startTime) / 1000);
    const successRate = systemStats.totalPackets > 0 
        ? ((systemStats.successfulPackets / systemStats.totalPackets) * 100).toFixed(1) 
        : 100;

    res.status(200).json({
        success: true,
        data: {
            uptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
            lastSeen: systemStats.lastSeen,
            successRate: `${successRate}%`,
            totalPackets: systemStats.totalPackets,
            filterHits: systemStats.filterHits,
            recentLogs: systemStats.recentLogs,
            mqttConfig: {
                broker: 'mqtt3.thingspeak.com',
                topic: 'channels/3315917/publish',
                clientId: 'BTQPJCUCJxgeNTMgMDcOMic'
            }
        }
    });
};
