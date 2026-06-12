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
  role: 'ADMIN' | 'STUDENT';
  isActive: boolean;
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
  createdAt?: string;
}

export interface Lecturer {
  id: number;
  name: string;
  email?: string;
  contact?: string;
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
