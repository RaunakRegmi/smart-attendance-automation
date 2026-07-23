class JobLogger {
  constructor() {
    this.logs = [];
  }

  logSyncEvent(event) {
    const logEntry = {
      jobId: event.jobId,
      triggerType: event.triggerType || 'scheduled',
      startTime: new Date(),
      status: 'in_progress',
      sheetsProcessed: event.sheetsProcessed || 0,
      recordsProcessed: event.recordsProcessed || 0,
      error: null
    };

    this.logs.push(logEntry);
    return logEntry;
  }

  logSyncSuccess(jobId) {
    const logEntry = this.logs.find(log => log.jobId === jobId);
    if (logEntry) {
      logEntry.status = 'success';
      logEntry.endTime = new Date();
    }
  }

  logSyncError(jobId, error) {
    const logEntry = this.logs.find(log => log.jobId === jobId);
    if (logEntry) {
      logEntry.status = 'failed';
      logEntry.endTime = new Date();
      logEntry.error = error.message;
    }
  }

  getJobDetails(jobId) {
    return this.logs.find(log => log.jobId === jobId);
  }

  filterLogs({ startDate, endDate, status, triggerType }) {
    return this.logs.filter(log => {
      let matches = true;

      if (startDate) matches &&=
        new Date(log.startTime) >= new Date(startDate);

      if (endDate) matches &&=
        new Date(log.endTime) <= new Date(endDate);

      if (status) matches &&=
        log.status === status;

      if (triggerType) matches &&=
        log.triggerType === triggerType;

      return matches;
    });
  }
}

module.exports = new JobLogger();