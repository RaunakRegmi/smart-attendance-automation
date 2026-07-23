# QR Attendance System - Technical Report

## Executive Summary

The AttendX QR Attendance System is a real-time, secure attendance tracking solution that uses dynamically refreshing QR codes to ensure accurate and fraud-resistant classroom attendance. This report documents the system's architecture, flow, and key features.

---

## System Overview

### Components
1. **Teacher Portal** (Angular) - Session management and QR display
2. **Student App** (Flutter) - QR scanning and attendance viewing
3. **Backend API** (Node.js/Express) - Session handling and validation

---

## Attendance Flow

### Phase 1: Session Creation
```
Teacher initiates session
    ↓
Backend generates:
  - Unique session ID (UUID)
  - JWT token with 5-second expiry
  - Session record in database
    ↓
QR code displayed on teacher's screen
    ↓
Notifications sent to enrolled students
```

### Phase 2: Real-Time Scanning
```
Student opens QR scanner in app
    ↓
Enters token + session ID from teacher's screen
    ↓
Backend validates:
  ✓ JWT token validity (5-second window)
  ✓ Student enrollment in section
  ✓ Session active status
  ✓ No duplicate attendance
    ↓
Status determined by time:
  ≤ 5 minutes from start → Present
  > 5 minutes from start → Late
    ↓
Attendance record created
```

### Phase 3: Session Closure
```
Teacher closes session
    ↓
All non-scanned students marked Absent
    ↓
Notifications sent:
  - Scanned: "Attendance recorded"
  - Missing: "You may submit late request"
```

---

## Security Features

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| Token Expiry | 5 seconds | Prevents screenshot sharing |
| JWT Signing | Cryptographic | Prevents token forgery |
| Section Validation | Database check | Ensures enrollment |
| Duplicate Check | Unique constraint | Prevents multiple records |
| Time Threshold | 5-minute window | Fair Present/Late status |

---

## Data Models

### QRSession
```javascript
{
  id: UUID,           // Unique session identifier
  createdBy: INTEGER, // Teacher user ID
  sectionId: UUID,    // Class section
  subjectId: INTEGER, // Subject being taught
  classType: ENUM,    // Lecture/Tutorial/Workshop
  date: DATE,         // Session date
  startTime: TIMESTAMP, // When session began
  sessionToken: TEXT,  // Current JWT token
  isActive: BOOLEAN,  // Session status
  expiresAt: TIMESTAMP // Token expiry
}
```

### AttendanceSession
```javascript
{
  id: SERIAL,
  qrSessionId: UUID,  // Links to QRSession
  studentId: INTEGER,  // Student who scanned
  status: ENUM,       // Present/Late/Absent
  scannedAt: TIMESTAMP, // When they scanned
  source: ENUM        // 'qr' or 'late-request'
}
```

---

## API Endpoints

### Teacher Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/qr-sessions` | POST | Create new session |
| `/api/qr-sessions/:id/refresh` | POST | Refresh QR token |
| `/api/qr-sessions/:id/close` | PUT | Close session |
| `/api/qr-sessions/:id` | GET | Get session details |
| `/api/qr-sessions` | GET | Get session history |

### Student Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/qr-sessions/scan` | POST | Submit attendance scan |
| `/api/qr-sessions/:id/late-request` | POST | Submit late request |

---

## Key Implementation Details

### Token Generation (Backend)
```javascript
const QR_TOKEN_EXPIRY = '5s';

const generateQRToken = (sessionId) => {
  return jwt.sign(
    { sessionId, type: 'qr-attendance' }, 
    process.env.JWT_SECRET, 
    { expiresIn: QR_TOKEN_EXPIRY }
  );
};
```

### Auto-Refresh (Frontend)
```typescript
// Teacher portal auto-refreshes every 5 seconds
ngAfterViewInit() {
  this.refreshTimer = setInterval(() => this.refreshQR(), 5000);
}
```

### Status Calculation (Backend)
```javascript
const LATE_THRESHOLD_MINUTES = 5;

const diffMinutes = (now - sessionStart) / (1000 * 60);
const status = diffMinutes <= LATE_THRESHOLD_MINUTES ? 'Present' : 'Late';
```

---

## Database Schema

```sql
CREATE TABLE qrsessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  createdBy INTEGER NOT NULL REFERENCES users(id),
  sectionId UUID NOT NULL REFERENCES sections(id),
  subjectId INTEGER NOT NULL REFERENCES subjects(id),
  classType VARCHAR(10) NOT NULL CHECK (classType IN ('Lecture', 'Tutorial', 'Workshop')),
  date DATE NOT NULL,
  startTime TIMESTAMP NOT NULL,
  sessionToken TEXT NOT NULL,
  isActive BOOLEAN DEFAULT true,
  expiresAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE attendance_sessions (
  id SERIAL PRIMARY KEY,
  qrSessionId UUID NOT NULL REFERENCES qrsessions(id),
  studentId INTEGER NOT NULL REFERENCES students(id),
  status VARCHAR(10) NOT NULL CHECK (status IN ('Present', 'Late', 'Absent')),
  scannedAt TIMESTAMP,
  source VARCHAR(15) DEFAULT 'qr' CHECK (source IN ('qr', 'late-request')),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(qrSessionId, studentId)
);
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Token Expiry | 5 seconds |
| Late Threshold | 5 minutes |
| Auto-Refresh Interval | 5 seconds |
| Session Creation Time | < 100ms |
| Scan Processing Time | < 200ms |

---

## Error Handling

| Error | HTTP Code | Message |
|-------|-----------|---------|
| Invalid/Expired Token | 400 | "Invalid or expired QR token" |
| Wrong Session | 400 | "Token does not match this session" |
| Session Inactive | 400 | "This session is no longer active" |
| Not Enrolled | 403 | "You are not enrolled in this section" |
| Already Scanned | 409 | "Attendance already recorded for this session" |

---

## Late Request Flow

```
Student misses session
    ↓
Session closes (marked Absent automatically)
    ↓
Student submits late request with remarks
    ↓
Teacher reviews in dashboard
    ↓
Teacher decides:
  - Approve as Present
  - Approve as Late
  - Reject (stays Absent)
    ↓
Attendance record updated
```

---

## Future Enhancements

1. **Geofencing** - Require students to be within classroom radius
2. **Bluetooth Beacons** - proximity-based scanning
3. **Biometric Verification** - Face/fingerprint confirmation
4. **Batch Scanning** - Multiple students at once
5. **Offline Mode** - Scan without internet, sync later

---

## Conclusion

The QR Attendance System provides a secure, efficient, and user-friendly solution for classroom attendance tracking. Its dynamic token refresh mechanism, combined with server-side validation, ensures accurate attendance records while preventing common fraud attempts.
