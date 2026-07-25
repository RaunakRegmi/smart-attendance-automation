export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: { msg: string }[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'STUDENT' | 'TEACHER';
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export interface AuthData {
  user: User;
  token: string;
}

export interface Batch {
  id: string;
  name: string;
  abbreviation?: string;
  Sections?: Section[];
  createdAt?: string;
}

export interface Faculty {
  id: string;
  name: string;
  createdAt?: string;
}

export interface Section {
  id: string;
  name: string;
  batchId: string;
  Batch?: Batch;
  createdAt?: string;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  batchId?: string;
  sectionId?: string;
  facultyId?: string;
  Batch?: Batch;
  Section?: Section;
  Faculty?: Faculty;
  faculty?: string;
  gender?: string;
  bloodGroup?: string;
  regNum?: string;
  univId?: string;
  admissionDate?: string;
  guardianName?: string;
  guardianContact?: string;
  createdAt?: string;
}

export interface Subject {
  id: number;
  subjectCode: string;
  subjectName?: string;
  batchId?: string;
  sectionId?: string;
  batch?: Batch;
  section?: Section;
  createdAt?: string;
}

export interface Lecturer {
  id: number;
  name: string;
  email?: string;
  contact?: string;
  subjects?: Subject[];
  hasAccount?: boolean;
  mustChangePassword?: boolean;
  accountActive?: boolean;
  userId?: number;
  createdAt?: string;
}

export interface StudentProfile {
  id: number;
  name: string;
  email: string;
  gender?: string;
  bloodGroup?: string;
  regNum?: string;
  univId?: string;
  admissionDate?: string;
  dob?: string;
  faculty?: string;
  facultyId?: string;
  guardianName?: string;
  guardianContact?: string;
  batchId?: number;
  sectionId?: number;
  Batch?: Batch;
  Section?: Section;
  Faculty?: Faculty;
  userId: number;
  createdAt?: string;
}

export interface ProfileResponse {
  user: User;
  student?: StudentProfile;
}

export interface SheetRecord {
  id: string;
  sheetName: string;
  sheetId: string;
  batchId: string;
  sectionId: string;
  status: 'active' | 'inactive';
  lastSuccessfulSyncTime?: string;
  lastAttemptedSyncTime?: string;
  Batch?: Batch;
  Section?: Section;
  metadata?: { url?: string };
}

/** Sync job row from GET /api/sync/status */
export interface SyncJob {
  id?: number;
  sheetId?: string;
  status?: string;
  syncType?: string;
  scheduledTime?: string;
  startTime?: string;
  endTime?: string;
  failureDetails?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QueueStatus {
  totalJobs?: number;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
}

export interface ReportStudent {
  id: number;
  name: string;
  email: string;
  regNum?: string;
  faculty?: string;
  facultyId?: string;
  section?: string;
}

export interface ReportSubject {
  code: string;
  name: string;
}

export interface ReportSubjectStat {
  subject: { id: number; code: string; name: string };
  total: number;
  present: number;
  absent: number;
  late: number;
  attendancePercentage: number;
  lowAttendance?: boolean;
  records?: { id: number; date: string; status: string }[];
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  attendancePercentage: number;
  lowAttendance?: boolean;
}

export interface StudentDailyReport {
  student: ReportStudent;
  date: string;
  totalSubjects: number;
  present: number;
  absent: number;
  late: number;
  attendance: { subject: ReportSubject; status: string; date: string }[];
}

export interface StudentSubjectWiseReport {
  student: ReportStudent;
  overall: AttendanceSummary;
  subjects: ReportSubjectStat[];
}

export interface StudentAggregateReport {
  student: ReportStudent & { Batch?: Batch; Section?: Section };
  overall: AttendanceSummary;
  subjectStats: ReportSubjectStat[];
  lowAttendanceSubjects: ReportSubjectStat[];
}

export interface SectionStudentReport {
  student: ReportStudent;
  overall: AttendanceSummary;
  subjectWise: Record<string, { total: number; present: number; absent: number; late: number; percentage: number }>;
}

export interface SectionWiseReport {
  section: { id: string; name: string; batch: { id: string; name: string } };
  subjects: Subject[];
  studentData: SectionStudentReport[];
}

export interface BatchStudentReport {
  student: ReportStudent & { section?: string };
  overall: AttendanceSummary;
}

export interface SectionComparison {
  section: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  studentCount: number;
}

export interface BatchWiseReport {
  batch: { id: string; name: string };
  sections: { id: string; name: string }[];
  studentData: BatchStudentReport[];
  sectionComparisons: SectionComparison[];
}

export interface SubjectWiseReport {
  subject: Subject;
  summary: AttendanceSummary & { totalSessions: number };
  records: { id: number; date: string; status: string; student: ReportStudent & { section?: string } }[];
}

export interface DailySummaryReport {
  date: string;
  summary: AttendanceSummary;
  subjectBreakdown: { subjectCode: string; subjectName: string; total: number; present: number; absent: number; late: number }[];
  absentStudents: { id: number; student: ReportStudent; subject: { code: string; name: string } }[];
}

export interface MonthlyReport {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  summary: AttendanceSummary & { workingDays: number };
  subjectBreakdown: { subject: { code: string; name: string }; total: number; present: number; absent: number; late: number }[];
  dailyTrend: { date: string; total: number; present: number; absent: number; late: number }[];
}

export interface DateRangeReport {
  dateRange: { startDate: string; endDate: string };
  summary: AttendanceSummary;
  records: { id: number; date: string; status: string; student: ReportStudent; subject: { id: number; code: string; name: string } }[];
}

export interface LowAttendanceReport {
  threshold: number;
  students: { student: ReportStudent & { section?: string }; overall: AttendanceSummary }[];
  totalLowAttendance: number;
  totalStudents: number;
}

export interface TopPerformer {
  rank: number;
  student: ReportStudent & { section?: string };
  total: number;
  present: number;
  absent: number;
  late: number;
  attendancePercentage: number;
}

export interface LeaderboardEntry {
  rank: number;
  student: ReportStudent & { section?: string };
  overall: AttendanceSummary;
  subjectPerformance: { subject: ReportSubject; total: number; present: number; percentage: number }[];
}

export interface LeaderboardReport {
  leaderboard: LeaderboardEntry[];
  summary: { totalStudents: number; averageAttendance: number; top25Average: number; bottom25Average: number };
}

export interface TrendAnalytics {
  period: { months: number; startDate: string; endDate: string };
  summary: AttendanceSummary;
  monthlyTrend: { month: string; total: number; present: number; absent: number; late: number; attendancePercentage: number }[];
  subjectPerformance: { subjectCode: string; total: number; present: number; absent: number; late: number; attendancePercentage: number }[];
}

export interface DashboardData {
  totalStudents: number;
  totalSubjects: number;
  totalBatches: number;
  generatedReports: number;
  presentToday: number;
  absentToday: number;
  markedToday: number;
  recentActivity: { id: string; title: string; timestamp: string }[];
  enrollmentTrend: { month: string; count: string }[];
  subjectsByDepartment: { department: string; count: number }[];
}

// ── Teacher management (admin) ───────────────────────────────────────────────

export interface TeacherAccount {
  id: number;
  email: string;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt?: string;
  name: string;
  lecturer: { id: number; name: string; contact?: string | null } | null;
  assignmentCount: number;
}

export type DeliveryChannel = 'email' | 'sms';

export interface ChannelDeliveryStatus {
  attempted: boolean;
  ok: boolean;
  provider?: string;
  to?: string;
  error?: string;
  demoMessage?: string;
}

export interface DeliveryStatus {
  email: ChannelDeliveryStatus;
  sms: ChannelDeliveryStatus;
}

export interface TeacherAssignmentRow {
  id: number;
  sectionId: string;
  sectionName: string | null;
  batchName: string | null;
  subjectId: number;
  subjectCode: string | null;
  subjectName: string | null;
  createdAt?: string;
}

// ── Messaging ────────────────────────────────────────────────────────────────

export type ThreadContextType = 'STUDENT_TEACHER_SUBJECT' | 'ADMIN_TEACHER' | 'ADMIN_BROADCAST';

export interface ThreadParticipant {
  userId: number;
  name: string;
  email: string | null;
  role: string | null;
  lastReadAt?: string | null;
  avatarUrl?: string | null;
}

export interface ThreadSummary {
  id: number;
  contextType: ThreadContextType;
  contextId: number | null;
  subject: { id: number; subjectCode: string; subjectName?: string } | null;
  title: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  participants: ThreadParticipant[];
  otherParticipants: ThreadParticipant[];
  lastMessage: {
    id: number;
    body: string;
    senderId: number | null;
    senderName: string | null;
    isSystem: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface ThreadMessageRow {
  id: number;
  threadId: number;
  senderId: number | null;
  senderName: string | null;
  senderRole: string | null;
  body: string;
  isSystem: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ThreadDetail {
  id: number;
  contextType: ThreadContextType;
  contextId: number | null;
  subject: { id: number; subjectCode: string; subjectName?: string } | null;
  title: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  participants: ThreadParticipant[];
}

export interface MessageContact {
  userId: number;
  name: string;
  email: string | null;
  subjects?: { id: number; subjectCode: string; subjectName?: string }[];
  studentId?: number;
  sectionId?: string;
}

export interface NotificationSummary {
  threadId: number;
  title: string | null;
  body: string | null;
  sentAt: string;
  totalRecipients: number;
  readCount: number;
}

export interface NotificationReadStatus extends NotificationSummary {
  recipients: { userId: number; name: string; email: string | null; read: boolean; readAt: string | null }[];
}

export interface UserNotification {
  messageId: number;
  threadId: number;
  title: string | null;
  body: string;
  contextType: ThreadContextType;
  createdAt: string;
  read: boolean;
}

// ── Teacher portal ───────────────────────────────────────────────────────────

export interface TeacherTodayClass {
  routineId: number;
  sectionId: string;
  sectionName: string | null;
  batchName: string | null;
  subjectId: number;
  subjectCode: string;
  subjectName: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  block: string | null;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
}

export interface UnresolvedRoutine {
  routineId: number;
  sectionId: string;
  sectionName: string | null;
  dayOfWeek: string;
  subjectCode: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface TeacherDashboard {
  teacher: { id: number; email: string; name: string; mustChangePassword: boolean };
  todayClasses: TeacherTodayClass[];
  unresolvedRoutines: UnresolvedRoutine[];
  stats: { sections: number; subjects: number; classes: number; studentsTaught: number; atRiskCount: number };
  messages: { unreadCount: number };
  notifications: UserNotification[];
}

export interface TeacherClass {
  assignmentId: number;
  sectionId: string;
  sectionName: string | null;
  batchName: string | null;
  subjectId: number;
  subjectCode: string | null;
  subjectName: string | null;
  studentCount: number;
  averageAttendance: number;
  atRiskCount: number;
}

export interface RosterStudent {
  id: number;
  name: string;
  email: string;
  regNum: string | null;
  univId: string | null;
  avatarUrl: string | null;
  userId: number | null;
  attendance: { total: number; present: number; absent: number; late: number; percentage: number; atRisk: boolean };
}

export interface TeacherRoster {
  section: { id: string; name: string | null; batchName: string | null };
  subject: { id: number; subjectCode: string | null; subjectName: string | null };
  students: RosterStudent[];
}

export interface AtRiskRow {
  student: { id: number; name: string; email: string; regNum: string | null; avatarUrl: string | null; userId: number | null };
  sectionId: string;
  sectionName: string | null;
  batchName: string | null;
  subjectId: number;
  subjectCode: string | null;
  subjectName: string | null;
  attendance: { total: number; present: number; absent: number; late: number; percentage: number; atRisk: boolean };
}

export interface TeacherReport {
  subject: { id: number; subjectCode: string; subjectName?: string };
  sections: { id: string; name: string | null; batchName: string | null }[];
  summary: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    totalSessions: number;
    attendancePercentage: number;
  };
  students: {
    student: { id: number; name: string; email: string; regNum: string | null; univId: string | null; sectionId: string };
    total: number;
    present: number;
    absent: number;
    late: number;
    attendancePercentage: number;
    lowAttendance: boolean;
  }[];
}

export interface TeacherAttendanceView {
  summary: { total: number; present: number; absent: number; late: number; attendancePercentage: number };
  records: { id: number; date: string; status: string; student: { id: number; name: string; regNum: string | null; univId: string | null } }[];
  readOnly: boolean;
}

export interface TeacherProfileData {
  user: User;
  lecturer: { id: number; name: string; email?: string | null; contact?: string | null } | null;
  assignments: TeacherAssignmentRow[];
}

// ── Student portal ──────────────────────────────────────────────────────────

export interface QrScanResult {
  status: 'Present' | 'Late';
  scannedAt: string;
}

export interface LateRequestResult {
  id: number;
  qrSessionId: string;
  remarks: string;
  status: string;
  createdAt: string;
}

// ── QR Attendance Sessions ───────────────────────────────────────────────────

export type ClassType = 'Lecture' | 'Tutorial' | 'Workshop';
export type SessionStatus = 'Active' | 'Closed';
export type ScanStatus = 'Present' | 'Late' | 'Absent';

export interface QRSession {
  id: string;
  sectionId: string;
  sectionName: string | null;
  batchName: string | null;
  subjectId: number;
  subjectCode: string | null;
  subjectName: string | null;
  classType: ClassType;
  date: string;
  status: SessionStatus;
  token: string;
  tokenExpiresAt: string;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  createdAt: string;
}

export interface QRSessionHistoryItem {
  id: string;
  sectionId: string;
  sectionName: string | null;
  batchName: string | null;
  subjectId: number;
  subjectCode: string | null;
  subjectName: string | null;
  classType: ClassType;
  date: string;
  status: SessionStatus;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  createdAt: string;
}

export interface AttendanceScan {
  id: number;
  studentId: number;
  studentName: string;
  regNum: string | null;
  univId: string | null;
  status: ScanStatus;
  scannedAt: string;
  isLateRequest: boolean;
  lateRequestStatus: string | null;
}

export interface QRSessionDetail {
  session: QRSessionHistoryItem;
  scans: AttendanceScan[];
}

export interface AttendanceRequest {
  id: number;
  sessionId: number;
  studentId: number;
  studentName: string;
  regNum: string | null;
  sessionDate: string;
  classType: ClassType;
  sectionName: string | null;
  subjectCode: string | null;
  remarks: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface CreateSessionPayload {
  sectionId: string;
  subjectId: number;
  classType: ClassType;
  date: string;
}

export interface DecideRequestPayload {
  status: 'Approved' | 'Rejected';
  resolvedStatus?: ScanStatus;
}
