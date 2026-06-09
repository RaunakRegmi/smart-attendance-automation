# Session Context

## Goal
Fix duplicate validation messages in routine upload.

## What was accomplished so far
- Removed file upload from attendance sync (separate path)
- Added format validation error messages in sheetsService.js sync
- Updated sheets-add frontend to show sync errors as warning toasts
- Updated routines-add frontend to show backend error messages
- Changed sheet linking to NOT create the sheet record if initial sync fails (sheet.destroy() on failure)
- Increased toast display duration from 4s to 6s
- Investigating "2 validation (dublicate) message" issue in routine upload

## What's pending
- User said "the 2 validation (dublicate) message in the upload routine fix" — need to understand what duplicate messages are appearing
- Was investigating error middleware and error interceptor to trace how error messages flow from backend to frontend

## Key context
- Routine controller: `catch (error) { next(error); }` — errors go to Express global error handler
- Error interceptor: skips 400 errors for toast, shows others
- Need to check the global error handler in index.js to understand response format

## Files relevant to current task
- `backend/src/controllers/routineController.js` — uploadRoutine uses next(error)
- `backend/src/index.js` — global error handler
- `admin/src/app/core/interceptors/error.interceptor.ts` — handles error display
- `admin/src/app/core/services/routine.service.ts` — uploadRoutine API call
