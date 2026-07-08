# Scheduler Management Enhancement Plan

**Status**: Planning
**Owner**: TBD
**Last updated**: 2026-05-13

## Summary
Requirements document for future enhancements to scheduler management, job notifications, testing, and admin dashboard integration.

## User Stories

### 1. UI Components for Scheduler Management
**As a** system administrator
**I want** a user interface to control sync scheduler operations
**So that** I can start, stop, and modify schedules without direct API calls

#### Requirements:
- Dashboard component showing current scheduler status
- Controls for: Start scheduler, Stop scheduler, Modify sync time
- Real-time status display (running/stopped, next run time)
- Form validation for time input (HH:MM format)
- Confirmation dialogs for destructive actions (stop scheduler)

### 2. Job Status Notifications
**As a** system administrator
**I want** to receive notifications when sync jobs complete or fail
**So that** I can take action on failed jobs immediately

#### Requirements:
- WebSocket/SSE connection for real-time updates
- Notification types: Job completed, Job failed, Scheduler started, Scheduler stopped
- Notification preferences (email, in-app, both)
- Notification history log
- Integration with existing notification system (Notification model)

### 3. Comprehensive Testing for Job Control Endpoints
**As a** developer
**I want** test coverage for all scheduler control endpoints
**So that** code changes don't break scheduler functionality

#### Requirements:
- Unit tests for: startScheduler, stopScheduler, modifyScheduler
- Integration tests for: /api/sync/start, /api/sync/stop, /api/sync/modify
- Mock tests for: schedulerService.start(), schedulerService.stop(), schedulerService.setSyncTime()
- Test scenarios:
  - Starting scheduler when already running
  - Stopping scheduler when not running
  - Modifying sync time with valid/invalid formats
  - Scheduler status endpoint responses
  - Queue status endpoint responses

### 4. Admin Dashboard Panels
**As a** system administrator
**I want** an admin dashboard with scheduler management panels
**So that** I can monitor and control all sync operations from one place

#### Requirements:
- Dashboard page with scheduler status widget
- Job queue overview panel
- Scheduler controls (start/stop/modify)
- Sync job history table with filtering
- Real-time updates via WebSocket/SSE
- Role-based access (ADMIN only)

## API Endpoints to be Enhanced

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/sync/start | Start the scheduler |
| POST | /api/sync/stop | Stop the scheduler |
| POST | /api/sync/modify | Modify sync time |
| GET | /api/sync/status | Get scheduler status |
| GET | /api/sync/queue-status | Get queue status |

## Technical Notes

### Existing Components to Leverage
- schedulerService.js - Scheduler control logic
- syncController.js - API controller methods
- syncRoutes.js - Route definitions
- Notification model - Existing notification system
- authMiddleware - Authentication middleware

### Files to Create/Modify
- Frontend components (React/Vue/Angular TBD)
- Notification service integration
- Test files (tests/scheduler/*)
- Admin dashboard pages

## Known Limitations
- Frontend framework TBD
- Real-time notification mechanism TBD
- Test framework TBD

## Related ADRs
- ADR-001 (Existing auth decisions)

## Next Steps
1. Choose frontend framework
2. Design notification architecture
3. Set up test framework
4. Implement UI components
