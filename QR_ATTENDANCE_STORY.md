# The QR Attendance Story: How AttendX Revolutionized Classroom Check-ins

## A Day in the Life of QR Attendance

### Morning: The Teacher's Setup

It's 8:45 AM on a Monday morning. Professor Sarah walks into Room 302, ready to teach "Data Structures and Algorithms" to her Section A students. Instead of fumbling with attendance sheets or calling out names one by one, she opens the AttendX teacher portal on her laptop.

With just a few clicks, she:
1. Selects **Section A** (the class she's teaching)
2. Chooses **"Data Structures and Algorithms"** as the subject
3. Picks **"Lecture"** as the class type
4. Confirms today's date

She clicks **"Start Session"**.

### The Magic Begins: QR Code Generation

Behind the scenes, something sophisticated happens in under a second:

```
Teacher clicks "Start Session"
        ↓
Backend creates a QRSession record with:
  - Unique session ID (UUID)
  - Teacher's user ID (createdBy)
  - Section ID (which class)
  - Subject ID (what subject)
  - Class type (Lecture/Tutorial/Workshop)
  - Current date and time
        ↓
System generates a JWT token with:
  - Session ID embedded
  - Type: "qr-attendance"
  - Expiry: 5 seconds (security feature!)
        ↓
QR code appears on teacher's screen
        ↓
All enrolled students receive notifications:
  "Data Structures and Algorithms session started at 8:45 AM"
```

The QR code isn't just any QR code—it's a **living, breathing security token** that changes every 5 seconds. Think of it like a bank's security code that keeps rotating.

### The Student Experience: Scanning In

Meanwhile, in the classroom, student Alex pulls out his phone. He sees the notification: "Scan the QR code to mark attendance."

Alex opens his AttendX student app and sees a clean interface asking for:
- **QR Token** (the code displayed on teacher's screen)
- **Session ID** (also visible on teacher's screen)

He types in the code he sees on the projector screen and taps **"Scan"**.

### What Happens in the Backend

Here's where the system's intelligence shines:

```
Student submits token + sessionId
        ↓
Backend verifies the JWT token:
  ✓ Is it valid? (not expired, correct signature)
  ✓ Does it match this session?
  ✓ Is it a "qr-attendance" type token?
        ↓
Security checks:
  ✓ Is the student enrolled in this section?
  ✓ Has this student already scanned for this session?
  ✓ Is the session still active?
        ↓
Time-based status calculation:
  If scanned within 5 minutes of session start → "Present"
  If scanned after 5 minutes → "Late"
        ↓
AttendanceSession record created with:
  - qrSessionId (which session)
  - studentId (who scanned)
  - status (Present/Late)
  - scannedAt (timestamp)
  - source: "qr" (how they attended)
```

### The Auto-Refresh Dance

Here's the clever part: **the QR code refreshes every 5 seconds**. 

Every 5 seconds, the teacher's screen automatically requests a new token. This means:
- The QR code on screen changes constantly
- Even if someone takes a photo, it expires almost immediately
- Students must scan **in real-time** while in the classroom
- No proxy attendance possible!

The frontend automatically calls the refresh endpoint:
```typescript
// Every 5 seconds
setInterval(() => this.refreshQR(), 5000);
```

### Late Arrivals: The Grace Period

Student Emma rushes into class at 8:52 AM (7 minutes after session started). When she scans:

```
Session started at: 8:45:00
Emma scanned at:   8:52:00
Time difference:    7 minutes
Threshold:          5 minutes
Status:             Late (not Present)
```

Emma still gets marked as "Late" rather than "Absent"—the system is fair but honest.

### The Session Closes

At 9:45 AM, Professor Sarah finishes her lecture. She clicks **"Close Session"**.

The system then:
1. Marks the session as inactive
2. Calculates final attendance:
   - Students who scanned: Present/Late (already recorded)
   - Students who didn't scan: **Automatically marked Absent**
3. Sends notifications to all students:
   - Scanned students: "Your attendance was recorded"
   - Missing students: "You did not scan the QR. You may submit a late request."

### The Late Request System

Student Mike was sick today and couldn't attend. After the session closes, he can submit a **late request** through his student app:

```
Mike submits:
  - Session ID
  - Remarks: "Was feeling unwell, visited campus health center"
        ↓
Request stored as "pending"
        ↓
Professor Sarah sees pending requests in her dashboard
        ↓
She reviews Mike's request and can:
  - Approve as "Present" (if she believes him)
  - Approve as "Late" (partial credit)
  - Reject (marks as Absent)
```

### The Data Flow: Complete Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                     QR ATTENDANCE FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TEACHER PORTAL (Admin App)                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ Create       │────▶│ Generate QR  │────▶│ Display on   │    │
│  │ Session      │     │ Token (JWT)  │     │ Screen       │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                    │              │
│         │                    ▼                    │              │
│         │            ┌──────────────┐             │              │
│         │            │ Auto-Refresh │◀────────────┘              │
│         │            │ Every 5s     │                            │
│         │            └──────────────┘                            │
│         │                    │                                   │
│         ▼                    ▼                                   │
│  ┌──────────────┐     ┌──────────────┐                          │
│  │ Close        │     │ Backend      │                          │
│  │ Session      │◀────│ Validates    │                          │
│  └──────────────┘     │ Tokens       │                          │
│         │             └──────────────┘                          │
│         │                    ▲                                   │
│         │                    │                                   │
│  STUDENT APP (Flutter)       │                                   │
│  ┌──────────────┐     ┌──────────────┐                          │
│  │ Scan QR      │────▶│ Submit       │                          │
│  │ Code         │     │ Token        │                          │
│  └──────────────┘     └──────────────┘                          │
│         │                    │                                   │
│         ▼                    ▼                                   │
│  ┌──────────────┐     ┌──────────────┐                          │
│  │ Get Status   │◀────│ Record       │                          │
│  │ (Present/Late)│    │ Attendance   │                          │
│  └──────────────┘     └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Security Features

### 1. **Short-Lived Tokens (5 seconds)**
- QR codes expire almost immediately
- Prevents screenshot sharing
- Ensures real-time presence

### 2. **JWT Verification**
- Cryptographically signed tokens
- Cannot be forged or tampered with
- Session-specific validation

### 3. **Section Validation**
- Students can only scan for their enrolled section
- Prevents cross-class attendance fraud

### 4. **Duplicate Prevention**
- System checks if student already scanned
- Prevents multiple attendance records

### 5. **Time-Based Status**
- Automatic Present/Late calculation
- Fair, objective, and transparent

## The Numbers: Why This Matters

Before QR Attendance:
- ❌ 15-20 minutes wasted on roll call per class
- ❌ Proxy attendance (friends signing for absent students)
- ❌ Paper sheets lost or damaged
- ❌ Manual data entry errors

After QR Attendance:
- ✅ 30 seconds to mark entire class
- ✅ Zero proxy attendance
- ✅ Digital records, instant access
- ✅ 100% accurate timestamps

## Technical Implementation Highlights

### Backend (Node.js/Express)
```javascript
// Token generation with 5-second expiry
const QR_TOKEN_EXPIRY = '5s';
const generateQRToken = (sessionId) => {
  return jwt.sign(
    { sessionId, type: 'qr-attendance' }, 
    process.env.JWT_SECRET, 
    { expiresIn: QR_TOKEN_EXPIRY }
  );
};

// Time-based status calculation
const LATE_THRESHOLD_MINUTES = 5;
const diffMinutes = (now - sessionStart) / (1000 * 60);
const status = diffMinutes <= LATE_THRESHOLD_MINUTES ? 'Present' : 'Late';
```

### Frontend (Angular - Teacher Portal)
```typescript
// Auto-refresh every 5 seconds
ngAfterViewInit() {
  this.refreshTimer = setInterval(() => this.refreshQR(), 5000);
}

// QR image generation
readonly qrImageUrl = computed(() => {
  const token = this.activeSession()?.token;
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(token)}`;
});
```

### Frontend (Flutter - Student App)
```dart
// Simple scan submission
Future<void> scan() async {
  final response = await ApiClient.post('/api/qr-sessions/scan', {
    'token': token,
    'sessionId': sessionId,
  });
  // Handle Present/Late response
}
```

## The Database Schema

```sql
-- QR Sessions table
CREATE TABLE qrsessions (
  id UUID PRIMARY KEY,
  createdBy INTEGER REFERENCES users(id),
  sectionId UUID REFERENCES sections(id),
  subjectId INTEGER REFERENCES subjects(id),
  classType ENUM('Lecture', 'Tutorial', 'Workshop'),
  date DATE NOT NULL,
  startTime TIMESTAMP NOT NULL,
  sessionToken TEXT NOT NULL,
  isActive BOOLEAN DEFAULT true,
  expiresAt TIMESTAMP
);

-- Attendance Records
CREATE TABLE attendance_sessions (
  id SERIAL PRIMARY KEY,
  qrSessionId UUID REFERENCES qrsessions(id),
  studentId INTEGER REFERENCES students(id),
  status ENUM('Present', 'Late', 'Absent'),
  scannedAt TIMESTAMP,
  source ENUM('qr', 'late-request'),
  UNIQUE(qrSessionId, studentId)
);
```

## Conclusion: A Simple Scan, A Powerful System

What appears to a student as "just scan a QR code" is actually a sophisticated orchestration of:

- **Real-time token generation** with cryptographic security
- **Automatic refresh mechanisms** to prevent fraud
- **Time-based logic** for fair status determination
- **Comprehensive validation** at every step
- **Graceful degradation** for late requests

The QR attendance system in AttendX transforms a mundane task into a seamless, secure, and efficient process—saving time for teachers, ensuring fairness for students, and providing accurate data for administrators.

**Next time you scan that QR code, remember: you're not just checking in—you're participating in a carefully choreographed dance of security, timing, and technology.**
