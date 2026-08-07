import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import './index.css'
import { useAuth } from './contexts/AuthContext'

// ── New pages (Phase 1–5) ─────────────────────────────────────────────────────
import SplashPage                from './pages/SplashPage'
import AssignmentDetailsPage     from './pages/AssignmentDetailsPage'
import AnnouncementDetailsPage   from './pages/AnnouncementDetailsPage'
import MobileStudentProfilePage  from './pages/mobile/MobileStudentProfilePage'
import SchoolAnalyticsPage       from './pages/admin/SchoolAnalyticsPage'
import AdminReportsPage          from './pages/admin/AdminReportsPage'
import PlatformBillingPage       from './pages/superadmin/PlatformBillingPage'
import PlansAndPricingPage       from './pages/superadmin/PlansAndPricingPage'
import PlatformAnalyticsPage     from './pages/superadmin/PlatformAnalyticsPage'
import SupportTicketsPage        from './pages/superadmin/SupportTicketsPage'
import PlatformSettingsPage      from './pages/superadmin/PlatformSettingsPage'
import SuperAdminUsersPage       from './pages/superadmin/SuperAdminUsersPage'

// ── Phase 6: Live Classes ─────────────────────────────────────────────────────
import LiveClassesOverviewPage   from './pages/LiveClassesOverviewPage'
import PreClassLobbyPage         from './pages/PreClassLobbyPage'
import LiveClassRoomPage         from './pages/LiveClassRoomPage'
import ClassRecordingsPage       from './pages/ClassRecordingsPage'
import ScheduleLiveClassPage     from './pages/ScheduleLiveClassPage'
import InClassAttendancePage     from './pages/InClassAttendancePage'

// ── Phase 6: AI Tutor ─────────────────────────────────────────────────────────
import AIChatSessionPage         from './pages/AIChatSessionPage'
import AIFlashcardsPage          from './pages/AIFlashcardsPage'
import AIStudyPlanPage           from './pages/AIStudyPlanPage'
import AIGeneratedQuizPage       from './pages/AIGeneratedQuizPage'
import AIUploadMaterialsPage     from './pages/AIUploadMaterialsPage'
import AISavedConversationsPage  from './pages/AISavedConversationsPage'
import AIImageSolverPage         from './pages/AIImageSolverPage'
import AIExamPrepPage            from './pages/AIExamPrepPage'
import AIRecommendationsPage     from './pages/AIRecommendationsPage'

// ── Phase 6: Analytics / Student ─────────────────────────────────────────────
import AttendanceAnalyticsPage   from './pages/AttendanceAnalyticsPage'
import StudyConsistencyPage      from './pages/StudyConsistencyPage'
import AcademicGoalsPage         from './pages/AcademicGoalsPage'
import LeaderboardPage           from './pages/LeaderboardPage'
import AchievementsPage          from './pages/AchievementsPage'
import CertificatesPage          from './pages/CertificatesPage'
import AcademicHistoryPage       from './pages/AcademicHistoryPage'
import DownloadsPage             from './pages/DownloadsPage'

// ── Phase 6: Teacher ──────────────────────────────────────────────────────────
import BehaviorAnalyticsPage     from './pages/BehaviorAnalyticsPage'
import ClassPerformancePage      from './pages/ClassPerformancePage'

// ── Phase 6: Admin ────────────────────────────────────────────────────────────
import TimetableManagementPage   from './pages/admin/TimetableManagementPage'
import TermCalendarSetupPage     from './pages/admin/TermCalendarSetupPage'
import AuditLogsPage             from './pages/admin/AuditLogsPage'
import RolesPermissionsPage      from './pages/admin/RolesPermissionsPage'
import PaymentIntegrationPage    from './pages/admin/PaymentIntegrationPage'

// ── Phase 6: Super Admin ──────────────────────────────────────────────────────
import SchoolDetailPage          from './pages/superadmin/SchoolDetailPage'
import FeatureFlagsPage          from './pages/superadmin/FeatureFlagsPage'
import EmailTemplatesPage        from './pages/superadmin/EmailTemplatesPage'
import BroadcastPage             from './pages/superadmin/BroadcastPage'

// ── Phase 6: Parent ───────────────────────────────────────────────────────────
import ChildTimetablePage        from './pages/parent/ChildTimetablePage'
import PermissionSlipsPage       from './pages/parent/PermissionSlipsPage'
import ParentAnnouncementsPage   from './pages/parent/ParentAnnouncementsPage'

import AdminResultsPage          from './pages/admin/AdminResultsPage'
import AdminClassDetailsPage     from './pages/admin/AdminClassDetailsPage'
import MobileStudentSettingsPage from './pages/mobile/MobileStudentSettingsPage'

// ── Checklist additions (round 2) ────────────────────────────────────────────
import ReportBuilderPage         from './pages/admin/ReportBuilderPage'
import BulkGradePage             from './pages/BulkGradePage'

// ── CBT exams ─────────────────────────────────────────────────────────────────
import CBTExamManagerPage        from './pages/CBTExamManagerPage'
import CBTExamTakePage           from './pages/CBTExamTakePage'

// ── Staff messaging (admin + super admin) ────────────────────────────────────
import StaffMessagesPage         from './pages/StaffMessagesPage'

// ── Bug-fix / new teacher & admin pages ──────────────────────────────────────
import AdminAttendancePage       from './pages/admin/AdminAttendancePage'
import AdminAnnouncementsPage    from './pages/admin/AdminAnnouncementsPage'
import AdminSupportPage          from './pages/admin/AdminSupportPage'
import AdminFeeSetupPage         from './pages/admin/AdminFeeSetupPage'
import FeeCollectionPage         from './pages/admin/FeeCollectionPage'
import TeacherCalendarPage       from './pages/TeacherCalendarPage'
import TeacherLiveClassesPage    from './pages/TeacherLiveClassesPage'
import TeacherResourcesPage      from './pages/TeacherResourcesPage'
import TeacherMessagesPage       from './pages/TeacherMessagesPage'
import TeacherAnnouncementsPage  from './pages/TeacherAnnouncementsPage'
import TeacherSettingsPage       from './pages/TeacherSettingsPage'
import TeacherSupportPage        from './pages/TeacherSupportPage'
import ParentMessageTeacherPage  from './pages/parent/ParentMessageTeacherPage'

// ── Checklist additions ───────────────────────────────────────────────────────
import LessonNotesPage           from './pages/LessonNotesPage'
import MySubmissionsPage         from './pages/MySubmissionsPage'
import StudentDetailViewPage     from './pages/StudentDetailViewPage'
import ExamSchedulePage          from './pages/ExamSchedulePage'
import StudyPlannerPage          from './pages/StudyPlannerPage'
import LessonPlannerPage         from './pages/LessonPlannerPage'
import TeacherAnalyticsPage      from './pages/TeacherAnalyticsPage'
import SchoolSystemSettingsPage  from './pages/admin/SchoolSystemSettingsPage'
import AdminIntegrationsPage     from './pages/admin/AdminIntegrationsPage'
import AppearanceSettingsPage    from './pages/AppearanceSettingsPage'
import OnboardingCarouselPage    from './pages/OnboardingCarouselPage'
import DiscussionForumPage       from './pages/DiscussionForumPage'
import QuizBuilderPage           from './pages/QuizBuilderPage'
import StudentTimetablePage     from './pages/StudentTimetablePage'
import BulkStudentImportPage    from './pages/admin/BulkStudentImportPage'

// ── New pages (round 3) ───────────────────────────────────────────────────────
import ConnectedDevicesPage      from './pages/ConnectedDevicesPage'
import PrivacySettingsPage       from './pages/PrivacySettingsPage'
import LinkedAccountsPage        from './pages/LinkedAccountsPage'
import AttendanceHistoryPage     from './pages/AttendanceHistoryPage'
import SubjectPerformancePage    from './pages/SubjectPerformancePage'
import DeadlinesViewPage         from './pages/DeadlinesViewPage'
import SharedFilesPage           from './pages/SharedFilesPage'
import CourseResourcesPage       from './pages/CourseResourcesPage'
import CourseSettingsPage        from './pages/CourseSettingsPage'
import PlagiarismCheckPage       from './pages/PlagiarismCheckPage'
import TwoFASetupPage            from './pages/TwoFASetupPage'
import AddEventPage              from './pages/AddEventPage'
import StorageManagementPage     from './pages/StorageManagementPage'
import BadgesRewardsPage         from './pages/BadgesRewardsPage'
import OfflineSyncPage           from './pages/OfflineSyncPage'
import WhiteboardPage            from './pages/WhiteboardPage'
import ScreenSharePage           from './pages/ScreenSharePage'
import ParticipantsPanelPage     from './pages/ParticipantsPanelPage'

// ── Landing ───────────────────────────────────────────────────────────────────
import LandingPage            from './pages/LandingPage'

// ── Auth ─────────────────────────────────────────────────────────────────────
import LoginPage              from './pages/LoginPage'
import SignUpPage             from './pages/SignUpPage'
import OTPVerificationPage    from './pages/OTPVerificationPage'
import RoleSelectionPage      from './pages/RoleSelectionPage'
import CompleteProfilePage    from './pages/CompleteProfilePage'
import ForgotPasswordPage     from './pages/ForgotPasswordPage'
import ResetPasswordPage      from './pages/ResetPasswordPage'
import SchoolSelectorPage     from './pages/SchoolSelectorPage'
import InviteAcceptancePage   from './pages/InviteAcceptancePage'
import SchoolSignUpPage       from './pages/SchoolSignUpPage'

// ── Desktop student ───────────────────────────────────────────────────────────
import OverviewDashboardPage  from './pages/OverviewDashboardPage'
import MyCoursesPage          from './pages/MyCoursesPage'
import CourseDetailsPage      from './pages/CourseDetailsPage'
import AssignmentsPage        from './pages/AssignmentsPage'
import StudentAnalysisPage    from './pages/StudentAnalysisPage'
import CalendarPage           from './pages/CalendarPage'
import EventDetailsPage       from './pages/EventDetailsPage'
import MessagesPage           from './pages/MessagesPage'
import GroupChatPage          from './pages/GroupChatPage'
import AnnouncementsFeedPage  from './pages/AnnouncementsFeedPage'
import AITutorPage            from './pages/AITutorPage'
import NotificationsPage      from './pages/NotificationsPage'
import NotificationDetailsPage from './pages/NotificationDetailsPage'

// ── Desktop teacher ───────────────────────────────────────────────────────────
import TeacherDashboardPage   from './pages/TeacherDashboardPage'
import MyClassesPage          from './pages/MyClassesPage'
import ClassDetailsPage       from './pages/ClassDetailsPage'
import StudentsManagementPage from './pages/StudentsManagementPage'
import StudentProfilePage     from './pages/StudentProfilePage'
import AttendanceManagementPage from './pages/AttendanceManagementPage'
import TeacherAssignmentsPage from './pages/TeacherAssignmentsPage'
import AssignmentBuilderPage  from './pages/AssignmentBuilderPage'
import SubmissionsInboxPage   from './pages/SubmissionsInboxPage'
import GradingScreenPage      from './pages/GradingScreenPage'
import GradeBookPage          from './pages/GradeBookPage'
import AnalysisPage           from './pages/AnalysisPage'
import ExaminationsPage       from './pages/ExaminationsPage'
import ReportPage             from './pages/ReportPage'
import AIGradingPage          from './pages/AIGradingPage'
import CourseBuilderPage      from './pages/CourseBuilderPage'
import LessonUploadPage       from './pages/LessonUploadPage'
import QuestionBankPage       from './pages/QuestionBankPage'
import CreateAssessmentPage   from './pages/CreateAssessmentPage'
import ComposeAnnouncementPage from './pages/ComposeAnnouncementPage'
import SupportCenterPage      from './pages/SupportCenterPage'

// ── Settings & Search ─────────────────────────────────────────────────────────
import SettingsPage           from './pages/SettingsPage'
import ProfileSettingsPage    from './pages/ProfileSettingsPage'
import NotificationSettingsPage from './pages/NotificationSettingsPage'
import SecuritySettingsPage   from './pages/SecuritySettingsPage'
import GlobalSearchPage       from './pages/GlobalSearchPage'
import EmptyStatePage         from './pages/EmptyStatePage'

// ── Admin ─────────────────────────────────────────────────────────────────────
import AdminDashboardPage     from './pages/admin/AdminDashboardPage'
import UserManagementPage     from './pages/admin/UserManagementPage'
import InviteUsersPage        from './pages/admin/InviteUsersPage'
import ClassesManagementPage  from './pages/admin/ClassesManagementPage'
import FinanceManagementPage  from './pages/admin/FinanceManagementPage'
import SubscriptionBillingPage from './pages/admin/SubscriptionBillingPage'

// ── Super Admin ───────────────────────────────────────────────────────────────
import SuperAdminDashboardPage    from './pages/superadmin/SuperAdminDashboardPage'
import SchoolsListPage            from './pages/superadmin/SchoolsListPage'
import OnboardSchoolPage          from './pages/superadmin/OnboardSchoolPage'
import SuperAdminNotificationsPage from './pages/superadmin/SuperAdminNotificationsPage'

// ── Mobile student ────────────────────────────────────────────────────────────
import MobileOnboardingPage      from './pages/mobile/MobileOnboardingPage'
import MobileStudentHomePage     from './pages/mobile/MobileStudentHomePage'
import MobileLearnPage           from './pages/mobile/MobileLearnPage'
import MobileStudentMessagesPage from './pages/mobile/MobileStudentMessagesPage'
import ChatRoomPage              from './pages/mobile/ChatRoomPage'
import MobileStudentCalendarPage from './pages/mobile/MobileStudentCalendarPage'
import LessonViewerPage          from './pages/mobile/LessonViewerPage'
import QuizPage                  from './pages/mobile/QuizPage'
import QuizResultPage            from './pages/mobile/QuizResultPage'
import LessonCompletionPage      from './pages/mobile/LessonCompletionPage'

// ── Parent ────────────────────────────────────────────────────────────────────
import ParentHomePage            from './pages/parent/ParentHomePage'
import ParentProgressPage        from './pages/parent/ParentProgressPage'
import ParentCalendarPage        from './pages/parent/ParentCalendarPage'
import ParentChatPage            from './pages/parent/ParentChatPage'
import ParentChatRoomPage        from './pages/parent/ParentChatRoomPage'
import ParentNotificationsPage   from './pages/parent/ParentNotificationsPage'
import ParentProfilePage         from './pages/parent/ParentProfilePage'
import SchoolFeesPage            from './pages/parent/SchoolFeesPage'
import SelectPaymentMethodPage   from './pages/parent/SelectPaymentMethodPage'
import MakePaymentPage           from './pages/parent/MakePaymentPage'
import PaymentReviewPage         from './pages/parent/PaymentReviewPage'
import PaymentSuccessPage        from './pages/parent/PaymentSuccessPage'
import ChildAttendancePage       from './pages/parent/ChildAttendancePage'
import ReportCardsPage           from './pages/parent/ReportCardsPage'

// ── Auth guards ───────────────────────────────────────────────────────────────
function getDashboardPath(role: string): string {
  const map: Record<string, string> = {
    student:     'dashboard',
    teacher:     'teacher-dashboard',
    admin:       'admin-dashboard',
    parent:      'parent/home',
    super_admin: 'super-dashboard',
  }
  return map[role] ?? 'login'
}

function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted">Loading…</p>
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

function RoleRoute({ roles }: { roles: string[] }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  if (!roles.includes(profile.role)) {
    return <Navigate to={`/${getDashboardPath(profile.role)}`} replace />
  }
  return <Outlet />
}

// ── useNav adapter ────────────────────────────────────────────────────────────
function useNav() {
  const navigate = useNavigate()
  return (page: string) => navigate('/' + page)
}

// ── Auth route wrappers ───────────────────────────────────────────────────────
function LoginRoute()           { const n = useNav(); return <LoginPage              onNavigate={n} /> }
function SignUpRoute()          { const n = useNav(); return <SignUpPage             onNavigate={n} /> }
function OTPRoute()             { const n = useNav(); return <OTPVerificationPage    onNavigate={n} /> }
function RoleSelectRoute()      { const n = useNav(); return <RoleSelectionPage      onNavigate={n} /> }
function CompleteProfileRoute() { const n = useNav(); return <CompleteProfilePage    onNavigate={n} /> }
function ForgotPwRoute()        { const n = useNav(); return <ForgotPasswordPage     onNavigate={n} /> }
function ResetPwRoute()         { const n = useNav(); return <ResetPasswordPage      onNavigate={n} /> }
function SchoolSelectRoute()    { const n = useNav(); return <SchoolSelectorPage     onNavigate={n} /> }
function InviteRoute()          { const n = useNav(); return <InviteAcceptancePage   onNavigate={n} /> }
function SchoolSignUpRoute()    { const n = useNav(); return <SchoolSignUpPage        onNavigate={n} /> }
function LandingRoute()         { const n = useNav(); return <LandingPage             onNavigate={n} /> }

// ── Desktop student wrappers ──────────────────────────────────────────────────
function DashboardRoute()       { const n = useNav(); return <OverviewDashboardPage  onNavigate={n} /> }
function CoursesRoute()         { const n = useNav(); return <MyCoursesPage          onNavigate={n} /> }
function CourseDetailsRoute()   { const n = useNav(); return <CourseDetailsPage      onNavigate={n} /> }
function AssignmentsRoute()     { const n = useNav(); return <AssignmentsPage        onNavigate={n} /> }
function AnalysisRoute()        { const n = useNav(); return <StudentAnalysisPage    onNavigate={n} /> }
function CalendarRoute()        { const n = useNav(); return <CalendarPage           onNavigate={n} /> }
function EventDetailsRoute()    { const n = useNav(); return <EventDetailsPage       onNavigate={n} /> }
function MessagesRoute()        { const n = useNav(); return <MessagesPage           onNavigate={n} /> }
function GroupChatRoute()       { const n = useNav(); return <GroupChatPage          onNavigate={n} /> }
function AnnouncementsRoute()   { const n = useNav(); return <AnnouncementsFeedPage  onNavigate={n} /> }
function AITutorRoute()         { const n = useNav(); return <AITutorPage            onNavigate={n} /> }
function NotifsRoute()          { const n = useNav(); return <NotificationsPage      onNavigate={n} /> }
function NotifDetailRoute()     { const n = useNav(); return <NotificationDetailsPage onNavigate={n} /> }

// ── Desktop teacher wrappers ──────────────────────────────────────────────────
function TeacherDashRoute()     { const n = useNav(); return <TeacherDashboardPage     onNavigate={n} /> }
function MyClassesRoute()       { const n = useNav(); return <MyClassesPage            onNavigate={n} /> }
function ClassDetailsRoute()    { const n = useNav(); return <ClassDetailsPage         onNavigate={n} /> }
function StudentsRoute()        { const n = useNav(); return <StudentsManagementPage   onNavigate={n} /> }
function StudentProfileRoute()  { const n = useNav(); return <StudentProfilePage       onNavigate={n} /> }
function AttendanceRoute()      { const n = useNav(); return <AttendanceManagementPage onNavigate={n} /> }
function TeacherAssignRoute()   { const n = useNav(); return <TeacherAssignmentsPage   onNavigate={n} /> }
function AssignBuilderRoute()   { const n = useNav(); return <AssignmentBuilderPage    onNavigate={n} /> }
function SubmissionsRoute()     { const n = useNav(); return <SubmissionsInboxPage     onNavigate={n} /> }
function GradingRoute()         { const n = useNav(); return <GradingScreenPage        onNavigate={n} /> }
function GradeBookRoute()       { const n = useNav(); return <GradeBookPage            onNavigate={n} /> }
function AnalyticsRoute()       { const n = useNav(); return <AnalysisPage             onNavigate={n} /> }
function ExaminationsRoute()    { const n = useNav(); return <ExaminationsPage         onNavigate={n} /> }
function ReportsRoute()         { const n = useNav(); return <ReportPage               onNavigate={n} /> }
function AIGradingRoute()       { const n = useNav(); return <AIGradingPage            onNavigate={n} /> }
function CourseBuilderRoute()   { const n = useNav(); return <CourseBuilderPage        onNavigate={n} /> }
function LessonUploadRoute()    { const n = useNav(); return <LessonUploadPage         onNavigate={n} /> }
function QuestionBankRoute()    { const n = useNav(); return <QuestionBankPage         onNavigate={n} /> }
function CreateAssessRoute()    { const n = useNav(); return <CreateAssessmentPage     onNavigate={n} /> }
function ComposeAnnouncRoute()  { const n = useNav(); return <ComposeAnnouncementPage  onNavigate={n} /> }
function SupportRoute()         { const n = useNav(); return <SupportCenterPage        onNavigate={n} /> }

// ── Settings & utility wrappers ───────────────────────────────────────────────
function SettingsRoute()        { const n = useNav(); return <SettingsPage              onNavigate={n} /> }
function ProfileSetRoute()      { const n = useNav(); return <ProfileSettingsPage       onNavigate={n} /> }
function NotifSetRoute()        { const n = useNav(); return <NotificationSettingsPage  onNavigate={n} /> }
function SecuritySetRoute()     { const n = useNav(); return <SecuritySettingsPage      onNavigate={n} /> }
function SearchRoute()          { const n = useNav(); return <GlobalSearchPage          onNavigate={n} /> }
function EmptyRoute()           { const n = useNav(); return <EmptyStatePage            onNavigate={n} /> }

// ── New page wrappers ─────────────────────────────────────────────────────────
function SplashRoute()              { const n = useNav(); return <SplashPage                onNavigate={n} /> }
function AssignDetailRoute()        { const n = useNav(); return <AssignmentDetailsPage     onNavigate={n} /> }
function AnnouncDetailRoute()       { const n = useNav(); return <AnnouncementDetailsPage   onNavigate={n} /> }
function MStudentProfileRoute()     { const n = useNav(); return <MobileStudentProfilePage  onNavigate={n} /> }
function SchoolAnalyticsRoute()     { const n = useNav(); return <SchoolAnalyticsPage       onNavigate={n} /> }
function AdminReportsRoute()        { const n = useNav(); return <AdminReportsPage          onNavigate={n} /> }
function PlatformBillingRoute()     { const n = useNav(); return <PlatformBillingPage       onNavigate={n} /> }
function PlansAndPricingRoute()     { const n = useNav(); return <PlansAndPricingPage       onNavigate={n} /> }
function PlatformAnalyticsRoute()   { const n = useNav(); return <PlatformAnalyticsPage     onNavigate={n} /> }
function SupportTicketsRoute()      { const n = useNav(); return <SupportTicketsPage        onNavigate={n} /> }
function PlatformSettingsRoute()    { const n = useNav(); return <PlatformSettingsPage      onNavigate={n} /> }

// ── Phase 6 wrappers ─────────────────────────────────────────────────────────
function LiveClassesRoute()         { const n = useNav(); return <LiveClassesOverviewPage   onNavigate={n} /> }
function PreClassLobbyRoute()       { const n = useNav(); return <PreClassLobbyPage         onNavigate={n} /> }
function LiveClassRoomRoute()       { const n = useNav(); return <LiveClassRoomPage         onNavigate={n} /> }
function ClassRecordingsRoute()     { const n = useNav(); return <ClassRecordingsPage       onNavigate={n} /> }
function ScheduleClassRoute()       { const n = useNav(); return <ScheduleLiveClassPage     onNavigate={n} /> }
function InClassAttRoute()          { const n = useNav(); return <InClassAttendancePage     onNavigate={n} /> }
function AIChatRoute()              { const n = useNav(); return <AIChatSessionPage         onNavigate={n} /> }
function AIFlashcardsRoute()        { const n = useNav(); return <AIFlashcardsPage          onNavigate={n} /> }
function AIStudyPlanRoute()         { const n = useNav(); return <AIStudyPlanPage           onNavigate={n} /> }
function AIQuizRoute()              { const n = useNav(); return <AIGeneratedQuizPage       onNavigate={n} /> }
function AIUploadRoute()            { const n = useNav(); return <AIUploadMaterialsPage     onNavigate={n} /> }
function AISavedRoute()             { const n = useNav(); return <AISavedConversationsPage  onNavigate={n} /> }
function AIImageSolverRoute()       { const n = useNav(); return <AIImageSolverPage         onNavigate={n} /> }
function AIExamPrepRoute()          { const n = useNav(); return <AIExamPrepPage            onNavigate={n} /> }
function AIRecommendRoute()         { const n = useNav(); return <AIRecommendationsPage     onNavigate={n} /> }
function AttendAnalyticsRoute()     { const n = useNav(); return <AttendanceAnalyticsPage   onNavigate={n} /> }
function StudyConsistRoute()        { const n = useNav(); return <StudyConsistencyPage      onNavigate={n} /> }
function AcademicGoalsRoute()       { const n = useNav(); return <AcademicGoalsPage         onNavigate={n} /> }
function LeaderboardRoute()         { const n = useNav(); return <LeaderboardPage           onNavigate={n} /> }
function AchievementsRoute()        { const n = useNav(); return <AchievementsPage          onNavigate={n} /> }
function CertificatesRoute()        { const n = useNav(); return <CertificatesPage          onNavigate={n} /> }
function AcademicHistoryRoute()     { const n = useNav(); return <AcademicHistoryPage       onNavigate={n} /> }
function DownloadsRoute()           { const n = useNav(); return <DownloadsPage             onNavigate={n} /> }
function BehaviorAnalyticsRoute()   { const n = useNav(); return <BehaviorAnalyticsPage     onNavigate={n} /> }
function ClassPerfRoute()           { const n = useNav(); return <ClassPerformancePage      onNavigate={n} /> }
function TimetableMgmtRoute()       { const n = useNav(); return <TimetableManagementPage   onNavigate={n} /> }
function TermCalendarRoute()        { const n = useNav(); return <TermCalendarSetupPage     onNavigate={n} /> }
function AuditLogsRoute()           { const n = useNav(); return <AuditLogsPage             onNavigate={n} /> }
function RolesPermRoute()           { const n = useNav(); return <RolesPermissionsPage      onNavigate={n} /> }
function PayIntegrationRoute()      { const n = useNav(); return <PaymentIntegrationPage    onNavigate={n} /> }
function SchoolDetailRoute()        { const n = useNav(); return <SchoolDetailPage          onNavigate={n} /> }
function FeatureFlagsRoute()        { const n = useNav(); return <FeatureFlagsPage          onNavigate={n} /> }
function EmailTemplatesRoute()      { const n = useNav(); return <EmailTemplatesPage        onNavigate={n} /> }
function BroadcastRoute()           { const n = useNav(); return <BroadcastPage             onNavigate={n} /> }
function ChildTimetableRoute()      { const n = useNav(); return <ChildTimetablePage        onNavigate={n} /> }
function PermissionSlipsRoute()     { const n = useNav(); return <PermissionSlipsPage       onNavigate={n} /> }
function ParentAnnouncRoute()       { const n = useNav(); return <ParentAnnouncementsPage   onNavigate={n} /> }

// ── Checklist wrappers ────────────────────────────────────────────────────────
function LessonNotesRoute()         { const n = useNav(); return <LessonNotesPage           onNavigate={n} /> }
function MySubmissionsRoute()       { const n = useNav(); return <MySubmissionsPage         onNavigate={n} /> }
function StudentDetailRoute()       { const n = useNav(); return <StudentDetailViewPage     onNavigate={n} /> }
function ExamScheduleRoute()        { const n = useNav(); return <ExamSchedulePage          onNavigate={n} /> }
function StudyPlannerRoute()        { const n = useNav(); return <StudyPlannerPage          onNavigate={n} /> }
function LessonPlannerRoute()       { const n = useNav(); return <LessonPlannerPage         onNavigate={n} /> }
function TeacherAnalyticsRoute()    { const n = useNav(); return <TeacherAnalyticsPage      onNavigate={n} /> }
function SchoolSettingsRoute()      { const n = useNav(); return <SchoolSystemSettingsPage  onNavigate={n} /> }
function IntegrationsRoute()        { const n = useNav(); return <AdminIntegrationsPage     onNavigate={n} /> }
function AppearanceRoute()          { const n = useNav(); return <AppearanceSettingsPage    onNavigate={n} /> }
function OnboardingCarouselRoute()  { const n = useNav(); return <OnboardingCarouselPage    onNavigate={n} /> }
function DiscussionForumRoute()     { const n = useNav(); return <DiscussionForumPage       onNavigate={n} /> }
function QuizBuilderRoute()         { const n = useNav(); return <QuizBuilderPage           onNavigate={n} /> }
function StudentTimetableRoute()    { const n = useNav(); return <StudentTimetablePage       onNavigate={n} /> }
function BulkStudentImportRoute()   { const n = useNav(); return <BulkStudentImportPage      onNavigate={n} /> }
function ReportBuilderRoute()       { const n = useNav(); return <ReportBuilderPage         onNavigate={n} /> }
function BulkGradeRoute()           { const n = useNav(); return <BulkGradePage             onNavigate={n} /> }
function CBTManagerRoute()          { const n = useNav(); return <CBTExamManagerPage        onNavigate={n} /> }
function CBTTakeRoute()             { const n = useNav(); return <CBTExamTakePage           onNavigate={n} /> }
function StaffMessagesRoute()       { const n = useNav(); return <StaffMessagesPage         onNavigate={n} /> }

// ── Round-3 wrappers ──────────────────────────────────────────────────────────
function ConnectedDevicesRoute()    { const n = useNav(); return <ConnectedDevicesPage   onNavigate={n} /> }
function PrivacySettingsRoute()     { const n = useNav(); return <PrivacySettingsPage    onNavigate={n} /> }
function LinkedAccountsRoute()      { const n = useNav(); return <LinkedAccountsPage     onNavigate={n} /> }
function AttendanceHistoryRoute()   { const n = useNav(); return <AttendanceHistoryPage  onNavigate={n} /> }
function SubjectPerfRoute()         { const n = useNav(); return <SubjectPerformancePage onNavigate={n} /> }
function DeadlinesRoute()           { const n = useNav(); return <DeadlinesViewPage      onNavigate={n} /> }
function SharedFilesRoute()         { const n = useNav(); return <SharedFilesPage        onNavigate={n} /> }
function CourseResourcesRoute()     { const n = useNav(); return <CourseResourcesPage    onNavigate={n} /> }
function CourseSettingsRoute()      { const n = useNav(); return <CourseSettingsPage     onNavigate={n} /> }
function PlagiarismRoute()          { const n = useNav(); return <PlagiarismCheckPage    onNavigate={n} /> }
function TwoFARoute()               { const n = useNav(); return <TwoFASetupPage         onNavigate={n} /> }
function AddEventRoute()            { const n = useNav(); return <AddEventPage           onNavigate={n} /> }
function StorageMgmtRoute()         { const n = useNav(); return <StorageManagementPage  onNavigate={n} /> }
function BadgesRewardsRoute()       { const n = useNav(); return <BadgesRewardsPage      onNavigate={n} /> }
function OfflineSyncRoute()         { const n = useNav(); return <OfflineSyncPage         onNavigate={n} /> }
function WhiteboardRoute()          { const n = useNav(); return <WhiteboardPage          onNavigate={n} /> }
function ScreenShareRoute()         { const n = useNav(); return <ScreenSharePage         onNavigate={n} /> }
function ParticipantsPanelRoute()   { const n = useNav(); return <ParticipantsPanelPage   onNavigate={n} /> }

// ── Bug-fix / new teacher & admin route wrappers ──────────────────────────────
function AdminAttendRoute()         { const n = useNav(); return <AdminAttendancePage        onNavigate={n} /> }
function AdminAnnouncRoute()        { const n = useNav(); return <AdminAnnouncementsPage     onNavigate={n} /> }
function AdminSupportRoute()        { const n = useNav(); return <AdminSupportPage           onNavigate={n} /> }
function AdminFeeSetupRoute()      { const n = useNav(); return <AdminFeeSetupPage          onNavigate={n} /> }
function FeeCollectionRoute()      { const n = useNav(); return <FeeCollectionPage          onNavigate={n} /> }
function TeacherCalRoute()          { const n = useNav(); return <TeacherCalendarPage        onNavigate={n} /> }
function TeacherLiveRoute()         { const n = useNav(); return <TeacherLiveClassesPage     onNavigate={n} /> }
function TeacherResourcesRoute()    { const n = useNav(); return <TeacherResourcesPage       onNavigate={n} /> }
function TeacherMsgsRoute()         { const n = useNav(); return <TeacherMessagesPage        onNavigate={n} /> }
function TeacherAnnouncRoute()      { const n = useNav(); return <TeacherAnnouncementsPage   onNavigate={n} /> }
function TeacherSettingsRoute()     { const n = useNav(); return <TeacherSettingsPage        onNavigate={n} /> }
function TeacherSupportRoute()      { const n = useNav(); return <TeacherSupportPage         onNavigate={n} /> }
function ParentMsgTeacherRoute()    { const n = useNav(); return <ParentMessageTeacherPage   onNavigate={n} /> }

// ── Admin wrappers ────────────────────────────────────────────────────────────
function AdminResultsRoute()    { const n = useNav(); return <AdminResultsPage        onNavigate={n} /> }
function AdminClassDetailsRoute() { const n = useNav(); return <AdminClassDetailsPage  onNavigate={n} /> }
function MStudentSettingsRoute() { const n = useNav(); return <MobileStudentSettingsPage onNavigate={n} /> }
function AdminDashRoute()       { const n = useNav(); return <AdminDashboardPage     onNavigate={n} /> }
function UserMgmtRoute()        { const n = useNav(); return <UserManagementPage     onNavigate={n} /> }
function InviteUsersRoute()     { const n = useNav(); return <InviteUsersPage        onNavigate={n} /> }
function ClassesMgmtRoute()     { const n = useNav(); return <ClassesManagementPage  onNavigate={n} /> }
function FinanceRoute()         { const n = useNav(); return <FinanceManagementPage  onNavigate={n} /> }
function SubscriptionRoute()    { const n = useNav(); return <SubscriptionBillingPage onNavigate={n} /> }

// ── Super Admin wrappers ──────────────────────────────────────────────────────
function SuperDashRoute()          { const n = useNav(); return <SuperAdminDashboardPage     onNavigate={n} /> }
function SchoolsListRoute()        { const n = useNav(); return <SchoolsListPage             onNavigate={n} /> }
function OnboardSchoolRoute()      { const n = useNav(); return <OnboardSchoolPage           onNavigate={n} /> }
function SuperNotifsRoute()        { const n = useNav(); return <SuperAdminNotificationsPage onNavigate={n} /> }
function SuperUsersRoute()         { const n = useNav(); return <SuperAdminUsersPage         onNavigate={n} /> }

// ── Mobile student wrappers ───────────────────────────────────────────────────
function OnboardingRoute()      { const n = useNav(); return <MobileOnboardingPage       onNavigate={n} /> }
function MStudentHomeRoute()    { const n = useNav(); return <MobileStudentHomePage       onNavigate={n} /> }
function MLearnRoute()          { const n = useNav(); return <MobileLearnPage             onNavigate={n} /> }
function MMessagesRoute()       { const n = useNav(); return <MobileStudentMessagesPage   onNavigate={n} /> }
function MChatRoomRoute()       { const n = useNav(); return <ChatRoomPage                onNavigate={n} backPage="m/messages" /> }
function MCalendarRoute()       { const n = useNav(); return <MobileStudentCalendarPage   onNavigate={n} /> }
function LessonRoute()          { const n = useNav(); return <LessonViewerPage            onNavigate={n} /> }
function QuizRoute()            { const n = useNav(); return <QuizPage                    onNavigate={n} /> }
function QuizResultRoute()      { const n = useNav(); return <QuizResultPage              onNavigate={n} /> }
function LessonCompleteRoute()  { const n = useNav(); return <LessonCompletionPage        onNavigate={n} /> }

// ── Parent wrappers ───────────────────────────────────────────────────────────
function ParentHomeRoute()      { const n = useNav(); return <ParentHomePage           onNavigate={n} /> }
function ParentProgressRoute()  { const n = useNav(); return <ParentProgressPage       onNavigate={n} /> }
function ParentCalRoute()       { const n = useNav(); return <ParentCalendarPage       onNavigate={n} /> }
function ParentChatRoute()      { const n = useNav(); return <ParentChatPage           onNavigate={n} /> }
function ParentChatRoomRoute()  { const n = useNav(); return <ParentChatRoomPage       onNavigate={n} backPage="parent/chat" /> }
function ParentNotifsRoute()    { const n = useNav(); return <ParentNotificationsPage  onNavigate={n} /> }
function ParentProfileRoute()   { const n = useNav(); return <ParentProfilePage        onNavigate={n} /> }
function SchoolFeesRoute()      { const n = useNav(); return <SchoolFeesPage           onNavigate={n} /> }
function PayMethodRoute()       { const n = useNav(); return <SelectPaymentMethodPage  onNavigate={n} /> }
function MakePayRoute()         { const n = useNav(); return <MakePaymentPage          onNavigate={n} /> }
function PayReviewRoute()       { const n = useNav(); return <PaymentReviewPage        onNavigate={n} /> }
function PaySuccessRoute()      { const n = useNav(); return <PaymentSuccessPage       onNavigate={n} /> }
function ChildAttRoute()        { const n = useNav(); return <ChildAttendancePage      onNavigate={n} /> }
function ReportCardsRoute()     { const n = useNav(); return <ReportCardsPage          onNavigate={n} /> }

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"                    element={<LandingRoute />} />
      <Route path="/login"               element={<LoginRoute />} />
      <Route path="/signup"              element={<SignUpRoute />} />
      <Route path="/otp-verify"          element={<OTPRoute />} />
      <Route path="/forgot-password"     element={<ForgotPwRoute />} />
      <Route path="/reset-password"      element={<ResetPwRoute />} />
      <Route path="/school-select"       element={<SchoolSelectRoute />} />
      <Route path="/invite"              element={<InviteRoute />} />
      <Route path="/school-signup"       element={<SchoolSignUpRoute />} />
      <Route path="/splash"              element={<SplashRoute />} />
      <Route path="/onboarding"          element={<OnboardingRoute />} />
      <Route path="/onboarding-carousel" element={<OnboardingCarouselRoute />} />

      <Route element={<ProtectedRoute />}>

        {/* Post-signup — role not yet assigned */}
        <Route path="/role-select"          element={<RoleSelectRoute />} />
        <Route path="/complete-profile"     element={<CompleteProfileRoute />} />

        {/* Shared utilities — all authenticated roles */}
        <Route path="/settings"             element={<SettingsRoute />} />
        <Route path="/profile-settings"     element={<ProfileSetRoute />} />
        <Route path="/notif-settings"       element={<NotifSetRoute />} />
        <Route path="/security-settings"    element={<SecuritySetRoute />} />
        <Route path="/search"               element={<SearchRoute />} />
        <Route path="/404"                  element={<EmptyRoute />} />
        <Route path="/2fa-setup"            element={<TwoFARoute />} />
        <Route path="/connected-devices"    element={<ConnectedDevicesRoute />} />
        <Route path="/privacy-settings"     element={<PrivacySettingsRoute />} />
        <Route path="/linked-accounts"      element={<LinkedAccountsRoute />} />
        <Route path="/storage-management"   element={<StorageMgmtRoute />} />
        <Route path="/offline-sync"         element={<OfflineSyncRoute />} />
        <Route path="/appearance-settings"  element={<AppearanceRoute />} />
        <Route path="/add-event"            element={<AddEventRoute />} />
        <Route path="/announcement-details" element={<AnnouncDetailRoute />} />
        <Route path="/notification-details" element={<NotifDetailRoute />} />

        {/* ── Student ──────────────────────────────────────────────── */}
        <Route element={<RoleRoute roles={['student']} />}>
          <Route path="/dashboard"            element={<DashboardRoute />} />
          <Route path="/courses"              element={<CoursesRoute />} />
          <Route path="/assignments"          element={<AssignmentsRoute />} />
          <Route path="/assignment-details"   element={<AssignDetailRoute />} />
          <Route path="/analysis"             element={<AnalysisRoute />} />
          <Route path="/calendar"             element={<CalendarRoute />} />
          <Route path="/event-details"        element={<EventDetailsRoute />} />
          <Route path="/messages"             element={<MessagesRoute />} />
          <Route path="/group-chat"           element={<GroupChatRoute />} />
          <Route path="/announcements"        element={<AnnouncementsRoute />} />
          <Route path="/ai-tutor"             element={<AITutorRoute />} />
          <Route path="/live-classes"         element={<LiveClassesRoute />} />
          <Route path="/downloads"            element={<DownloadsRoute />} />
          <Route path="/student-timetable"    element={<StudentTimetableRoute />} />
          <Route path="/attendance-analytics" element={<AttendAnalyticsRoute />} />
          <Route path="/study-consistency"    element={<StudyConsistRoute />} />
          <Route path="/academic-goals"       element={<AcademicGoalsRoute />} />
          <Route path="/leaderboard"          element={<LeaderboardRoute />} />
          <Route path="/achievements"         element={<AchievementsRoute />} />
          <Route path="/certificates"         element={<CertificatesRoute />} />
          <Route path="/academic-history"     element={<AcademicHistoryRoute />} />
          <Route path="/attendance-history"   element={<AttendanceHistoryRoute />} />
          <Route path="/subject-performance"  element={<SubjectPerfRoute />} />
          <Route path="/deadlines"            element={<DeadlinesRoute />} />
          <Route path="/badges-rewards"       element={<BadgesRewardsRoute />} />
          <Route path="/lesson-notes"         element={<LessonNotesRoute />} />
          <Route path="/my-submissions"       element={<MySubmissionsRoute />} />
          <Route path="/exam-schedule"        element={<ExamScheduleRoute />} />
          <Route path="/cbt-exam"             element={<CBTTakeRoute />} />
          <Route path="/study-planner"        element={<StudyPlannerRoute />} />
          <Route path="/discussion-forum"     element={<DiscussionForumRoute />} />
          {/* AI Tutor pages */}
          <Route path="/ai-chat"              element={<AIChatRoute />} />
          <Route path="/ai-flashcards"        element={<AIFlashcardsRoute />} />
          <Route path="/ai-study-plan"        element={<AIStudyPlanRoute />} />
          <Route path="/ai-quiz"              element={<AIQuizRoute />} />
          <Route path="/ai-upload"            element={<AIUploadRoute />} />
          <Route path="/ai-saved"             element={<AISavedRoute />} />
          <Route path="/ai-image-solver"      element={<AIImageSolverRoute />} />
          <Route path="/ai-exam-prep"         element={<AIExamPrepRoute />} />
          <Route path="/ai-recommendations"   element={<AIRecommendRoute />} />
          {/* Mobile student */}
          <Route path="/m/home"               element={<MStudentHomeRoute />} />
          <Route path="/m/learn"              element={<MLearnRoute />} />
          <Route path="/m/messages"           element={<MMessagesRoute />} />
          <Route path="/m/chat-room"          element={<MChatRoomRoute />} />
          <Route path="/m/calendar"           element={<MCalendarRoute />} />
          <Route path="/m/lesson"             element={<LessonRoute />} />
          <Route path="/m/quiz"               element={<QuizRoute />} />
          <Route path="/m/quiz-result"        element={<QuizResultRoute />} />
          <Route path="/m/lesson-complete"    element={<LessonCompleteRoute />} />
          <Route path="/m/settings"           element={<MStudentSettingsRoute />} />
          <Route path="/m/profile"            element={<MStudentProfileRoute />} />
        </Route>

        {/* ── Student + Teacher + Admin (in-app notifications) ──────── */}
        <Route element={<RoleRoute roles={['student', 'teacher', 'admin']} />}>
          <Route path="/notifications"        element={<NotifsRoute />} />
        </Route>

        {/* ── Student + Teacher (course content & classroom) ────────── */}
        <Route element={<RoleRoute roles={['student', 'teacher']} />}>
          <Route path="/course-details"       element={<CourseDetailsRoute />} />
          <Route path="/course-resources"     element={<CourseResourcesRoute />} />
          <Route path="/shared-files"         element={<SharedFilesRoute />} />
          <Route path="/class-recordings"     element={<ClassRecordingsRoute />} />
          <Route path="/pre-class-lobby"      element={<PreClassLobbyRoute />} />
          <Route path="/live-classroom"       element={<LiveClassRoomRoute />} />
          <Route path="/screen-share"         element={<ScreenShareRoute />} />
          <Route path="/participants-panel"   element={<ParticipantsPanelRoute />} />
          <Route path="/whiteboard"           element={<WhiteboardRoute />} />
        </Route>

        {/* ── Teacher ──────────────────────────────────────────────── */}
        <Route element={<RoleRoute roles={['teacher']} />}>
          <Route path="/teacher-dashboard"     element={<TeacherDashRoute />} />
          <Route path="/classes"               element={<MyClassesRoute />} />
          <Route path="/class-details"         element={<ClassDetailsRoute />} />
          <Route path="/students"              element={<StudentsRoute />} />
          <Route path="/student-profile"       element={<StudentProfileRoute />} />
          <Route path="/student-detail"        element={<StudentDetailRoute />} />
          <Route path="/attendance"            element={<AttendanceRoute />} />
          <Route path="/teacher-assignments"   element={<TeacherAssignRoute />} />
          <Route path="/assignment-builder"    element={<AssignBuilderRoute />} />
          <Route path="/submissions-inbox"     element={<SubmissionsRoute />} />
          <Route path="/grading-screen"        element={<GradingRoute />} />
          <Route path="/gradebook"             element={<GradeBookRoute />} />
          <Route path="/analytics"             element={<AnalyticsRoute />} />
          <Route path="/examinations"          element={<ExaminationsRoute />} />
          <Route path="/reports"               element={<ReportsRoute />} />
          <Route path="/ai-grading"            element={<AIGradingRoute />} />
          <Route path="/ai-assistant"          element={<AIGradingRoute />} />
          <Route path="/course-builder"        element={<CourseBuilderRoute />} />
          <Route path="/lesson-upload"         element={<LessonUploadRoute />} />
          <Route path="/course-settings"       element={<CourseSettingsRoute />} />
          <Route path="/question-bank"         element={<QuestionBankRoute />} />
          <Route path="/create-assessment"     element={<CreateAssessRoute />} />
          <Route path="/compose-announcement"  element={<ComposeAnnouncRoute />} />
          <Route path="/support"               element={<SupportRoute />} />
          <Route path="/behavior-analytics"    element={<BehaviorAnalyticsRoute />} />
          <Route path="/class-performance"     element={<ClassPerfRoute />} />
          <Route path="/teacher-live-classes"  element={<TeacherLiveRoute />} />
          <Route path="/schedule-class"        element={<ScheduleClassRoute />} />
          <Route path="/inclass-attendance"    element={<InClassAttRoute />} />
          <Route path="/teacher-calendar"      element={<TeacherCalRoute />} />
          <Route path="/resources"             element={<TeacherResourcesRoute />} />
          <Route path="/teacher-messages"      element={<TeacherMsgsRoute />} />
          <Route path="/teacher-announcements" element={<TeacherAnnouncRoute />} />
          <Route path="/teacher-settings"      element={<TeacherSettingsRoute />} />
          <Route path="/teacher-support"       element={<TeacherSupportRoute />} />
          <Route path="/lesson-planner"        element={<LessonPlannerRoute />} />
          <Route path="/teacher-analytics"     element={<TeacherAnalyticsRoute />} />
          <Route path="/quiz-builder"          element={<QuizBuilderRoute />} />
          <Route path="/cbt-exams"             element={<CBTManagerRoute />} />
          <Route path="/bulk-grade"            element={<BulkGradeRoute />} />
          <Route path="/plagiarism-check"      element={<PlagiarismRoute />} />
        </Route>

        {/* ── Parent ───────────────────────────────────────────────── */}
        <Route element={<RoleRoute roles={['parent']} />}>
          <Route path="/parent/home"             element={<ParentHomeRoute />} />
          <Route path="/parent/progress"         element={<ParentProgressRoute />} />
          <Route path="/parent/calendar"         element={<ParentCalRoute />} />
          <Route path="/parent/chat"             element={<ParentChatRoute />} />
          <Route path="/parent/chat-room"        element={<ParentChatRoomRoute />} />
          <Route path="/parent/notifications"    element={<ParentNotifsRoute />} />
          <Route path="/parent/profile"          element={<ParentProfileRoute />} />
          <Route path="/parent/fees"             element={<SchoolFeesRoute />} />
          <Route path="/parent/payment-method"   element={<PayMethodRoute />} />
          <Route path="/parent/payment"          element={<MakePayRoute />} />
          <Route path="/parent/payment-review"   element={<PayReviewRoute />} />
          <Route path="/parent/payment-success"  element={<PaySuccessRoute />} />
          <Route path="/parent/attendance"       element={<ChildAttRoute />} />
          <Route path="/parent/report-cards"     element={<ReportCardsRoute />} />
          <Route path="/parent/message-teacher"  element={<ParentMsgTeacherRoute />} />
          <Route path="/parent/timetable"        element={<ChildTimetableRoute />} />
          <Route path="/parent/permission-slips" element={<PermissionSlipsRoute />} />
          <Route path="/parent/announcements"    element={<ParentAnnouncRoute />} />
        </Route>

        {/* ── Admin ────────────────────────────────────────────────── */}
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/admin-dashboard"     element={<AdminDashRoute />} />
          <Route path="/user-management"     element={<UserMgmtRoute />} />
          <Route path="/invite-users"        element={<InviteUsersRoute />} />
          <Route path="/classes-management"  element={<ClassesMgmtRoute />} />
          <Route path="/finance"             element={<FinanceRoute />} />
          <Route path="/subscription"        element={<SubscriptionRoute />} />
          <Route path="/school-analytics"    element={<SchoolAnalyticsRoute />} />
          <Route path="/admin-reports"       element={<AdminReportsRoute />} />
          <Route path="/admin-attendance"    element={<AdminAttendRoute />} />
          <Route path="/admin-announcements" element={<AdminAnnouncRoute />} />
          <Route path="/admin-support"       element={<AdminSupportRoute />} />
          <Route path="/admin-fee-setup"     element={<AdminFeeSetupRoute />} />
          <Route path="/fee-collection"      element={<FeeCollectionRoute />} />
          <Route path="/admin-results"       element={<AdminResultsRoute />} />
          <Route path="/admin-class-details" element={<AdminClassDetailsRoute />} />
          <Route path="/timetable"           element={<TimetableMgmtRoute />} />
          <Route path="/bulk-import"         element={<BulkStudentImportRoute />} />
          <Route path="/term-calendar"       element={<TermCalendarRoute />} />
          <Route path="/roles-permissions"   element={<RolesPermRoute />} />
          <Route path="/payment-integration" element={<PayIntegrationRoute />} />
          <Route path="/report-builder"      element={<ReportBuilderRoute />} />
          <Route path="/school-settings"     element={<SchoolSettingsRoute />} />
          <Route path="/integrations"        element={<IntegrationsRoute />} />
          <Route path="/admin-messages"      element={<StaffMessagesRoute />} />
        </Route>

        {/* ── Admin + Super Admin shared ────────────────────────────── */}
        <Route element={<RoleRoute roles={['admin', 'super_admin']} />}>
          <Route path="/audit-logs"          element={<AuditLogsRoute />} />
        </Route>

        {/* ── Super Admin ──────────────────────────────────────────── */}
        <Route element={<RoleRoute roles={['super_admin']} />}>
          <Route path="/super-dashboard"     element={<SuperDashRoute />} />
          <Route path="/schools-list"        element={<SchoolsListRoute />} />
          <Route path="/super-users"         element={<SuperUsersRoute />} />
          <Route path="/onboard-school"      element={<OnboardSchoolRoute />} />
          <Route path="/super-notifications" element={<SuperNotifsRoute />} />
          <Route path="/platform-billing"    element={<PlatformBillingRoute />} />
          <Route path="/plans-pricing"       element={<PlansAndPricingRoute />} />
          <Route path="/platform-analytics"  element={<PlatformAnalyticsRoute />} />
          <Route path="/support-tickets"     element={<SupportTicketsRoute />} />
          <Route path="/platform-settings"   element={<PlatformSettingsRoute />} />
          <Route path="/school-detail"       element={<SchoolDetailRoute />} />
          <Route path="/feature-flags"       element={<FeatureFlagsRoute />} />
          <Route path="/email-templates"     element={<EmailTemplatesRoute />} />
          <Route path="/broadcast"           element={<BroadcastRoute />} />
          <Route path="/super-messages"      element={<StaffMessagesRoute />} />
        </Route>

      </Route>{/* end ProtectedRoute */}

      <Route path="/logout" element={<Navigate to="/login" replace />} />
      <Route path="*"       element={<Navigate to="/404"   replace />} />
    </Routes>
  )
}
