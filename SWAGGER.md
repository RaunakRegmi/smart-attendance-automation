# Student Portal API – Individual Endpoints

## 🗓️ Schedule Module Endpoints

All schedule endpoints now require authentication and return mobile-optimized responses:

### GET /api/schedule/today
**Description:** Returns today's class schedule for logged-in student  
**Authentication:** Bearer token required  
**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "subjectCode": "MAT101",
      "subjectName": "Mathematics",
      "startTime": "09:00",
      "endTime": "10:30",
      "room": "A-101",
      "status": "ONGOING"
    }
  ]
}
```

### GET /api/schedule/week
**Description:** Returns weekly grouped schedule for logged-in student  
**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "day": "Monday",
      "classes": [
        {
          "subjectCode": "MAT101",
          "subjectName": "Mathematics",
          "startTime": "09:00",
          "endTime": "10:30",
          "room": "A-101"
        }
      ]
    }
  ]
}
```

### GET /api/schedule/full
**Description:** Returns complete timetable for logged-in student  
**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "day": "Monday",
      "classes": [
        {
          "subjectCode": "MAT101",
          "subjectName": "Mathematics",
          "startTime": "09:00",
          "endTime": "10:30",
          "room": "A-101"
        }
      ]
    },
    {
      "day": "Tuesday",
      "classes": [
        {
          "subjectCode": "PHY101",
          "subjectName": "Physics",
          "startTime": "10:45",
          "endTime": "12:15",
          "room": "B-201"
        }
      ]
    }
  ]
}
```

## 🔔 Notification Module Endpoints

New notification system for student alerts and updates:

### GET /api/notifications
**Description:** Get all unread notifications for logged-in student  
**Authentication:** Bearer token required  
**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "title": "Section Changed - CS101",
      "description": "Your Computer Science section moved from Room B-201 to B-205",
      "category": "SCHEDULE",
      "targetUserId": 42,
      "isRead": false
    }
  ]
}
```

### PUT /api/notifications/:id/read
**Description:** Mark notification as read for logged-in student  
**Authentication:** Bearer token required  
**Response Structure:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "isRead": true
  }
}
```

### POST /api/notifications
**Description:** Create new notification (Admin only)  
**Authentication:** Admin token required  
**Body Parameters:**
```json
{
  "title": "New Announcement",
  "description": "Important date change for upcoming exams",
  "category": "SCHEDULE",
  "targetUserId": 42
}
```

## 🔑 Security Updates
- Unified authentication across all new endpoints using `bearerAuth`  
- Student access controlled by User ID from token  
- Admin access requires explicit authorization  
- All endpoints enforce appropriate permission checks  

## 📱 Mobile UI Integration
- Schedule endpoints optimized for mobile card rendering  
- Notification endpoints designed for real-time push updates  
- System transformation complete for student productivity dashboard  
