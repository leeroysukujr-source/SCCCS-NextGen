import React, { Suspense } from 'react'
import { lazyWithRetry as lazy } from './utils/lazy'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
const Signup = lazy(() => import('./pages/Signup'))
import OAuthCallback from './pages/OAuthCallback'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const VideoBuddy = lazy(() => import('./pages/VideoBuddy'))
const VideoBuddyHome = lazy(() => import('./pages/video-buddy/VideoBuddyHome'))
const VideoCalendar = lazy(() => import('./pages/video-buddy/VideoCalendar'))
const VideoMeeting = lazy(() => import('./pages/video-buddy/VideoMeeting'))
const VideoContacts = lazy(() => import('./pages/video-buddy/VideoContacts'))
const VideoRecording = lazy(() => import('./pages/video-buddy/VideoRecording'))
const WorkspaceEntry = lazy(() => import('./pages/WorkspaceEntry.jsx'))
const Whiteboard = lazy(() => import('./pages/video-buddy/Whiteboard'))
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
const Meeting = lazy(() => import('./pages/MeetingEnhanced'))
const Chat = lazy(() => import('./pages/Chat'))
import Classes from './pages/Classes'
import ClassDetail from './pages/ClassDetail'
import LessonDetail from './pages/LessonDetail'
import LessonMaterials from './pages/LessonMaterials'
import Profile from './pages/Profile'
const ManageStudents = lazy(() => import('./pages/admin/ManageStudents'))
import ManageUsers from './pages/admin/ManageUsers'
const ManageRooms = lazy(() => import('./pages/admin/ManageRooms'))
const ManageClasses = lazy(() => import('./pages/admin/ManageClasses'))
const ManageGroups = lazy(() => import('./pages/admin/ManageGroups'))
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const AdminManagement = lazy(() => import('./pages/admin/AdminManagement'))
const TwoFactorAudits = lazy(() => import('./pages/admin/TwoFactorAudits'))
const InstitutionalSettings = lazy(() => import('./pages/dashboards/InstitutionalSettings'))
const WorkspaceSettings = lazy(() => import('./pages/admin/WorkspaceSettings'))
const SettingsDashboard = lazy(() => import('./pages/dashboards/SettingsDashboard'))
const SuperAdminDashboard = lazy(() => import('./pages/dashboards/SuperAdminDashboard'))
const FeatureLab = lazy(() => import('./pages/dashboards/FeatureLab'))
const SecurityAuditCenter = lazy(() => import('./pages/dashboards/SecurityAuditCenter'))
import Groups from './pages/Groups'
import JoinMeeting from './pages/JoinMeeting'
import RecentMeetings from './pages/RecentMeetings'
import Settings from './pages/Settings'
import Analytics from './pages/Analytics'
const DirectMessages = lazy(() => import('./pages/DirectMessages'))
import Feedback from './pages/Feedback'
import GpaCalculator from './pages/GpaCalculator'
import TwoFactor from './pages/TwoFactor'
import Sessions from './pages/Sessions'
const StudyRoom = lazy(() => import('./pages/StudyRoom'))
const CreationHub = lazy(() => import('./pages/creation/CreationHub'))
const CreationHubAudit = lazy(() => import('./pages/admin/CreationHubAudit'))
const CreationPolicyManager = lazy(() => import('./pages/admin/CreationPolicyManager'))
const GroupStudy = lazy(() => import('./pages/study-room/GroupStudy'))
const PeerTutoring = lazy(() => import('./pages/study-room/PeerTutoring'))
const TopicDiscussions = lazy(() => import('./pages/study-room/TopicDiscussions'))
const StudyRoomLive = lazy(() => import('./pages/study-room/StudyRoomLive'))
const StudyGroupDetail = lazy(() => import('./pages/study-room/StudyGroupDetail'))
const AssignmentGroupRoom = lazy(() => import('./pages/study-room/AssignmentGroupRoom'))
const AssignmentGrading = lazy(() => import('./pages/AssignmentGrading'))
const GradingHub = lazy(() => import('./pages/GradingHub'))
import Layout from './components/Layout'
import SuperAdminLayout from './components/SuperAdminLayout'
import SocketProvider from './contexts/SocketProvider'
import ErrorBoundary from './components/ErrorBoundary'
import SystemSettingsBootstrapper from './components/SystemSettingsBootstrapper'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})


function RequireWorkspace({ children }) {
  const { user } = useAuthStore()

  // Allow super admins to bypass
  if (user?.role === 'super_admin' || user?.platform_role === 'SUPER_ADMIN') {
    return children
  }

  if (!user?.workspace_id) {
    return <Navigate to="/workspace-entry" replace />
  }

  return children
}

function PrivateRoute({ children }) {
  const { isAuthenticated, hasHydrated } = useAuthStore()

  if (!hasHydrated) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return isAuthenticated ? children : <Navigate to="/login" />
}

function SuperAdminRoute({ children }) {
  const { isAuthenticated, user, hasHydrated } = useAuthStore()

  if (!hasHydrated) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  const isSuperAdmin = user?.platform_role === 'SUPER_ADMIN' || user?.role === 'super_admin'

  return isAuthenticated && isSuperAdmin ? children : <Navigate to="/" />
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" />

  if (user?.platform_role === 'SUPER_ADMIN' || user?.role === 'super_admin') {
    return <Navigate to="/superadmin/control-center" />
  }

  if (user?.workspace_id) {
    return <Navigate to="/dashboard" />
  }

  return <Navigate to="/workspace-entry" />
}

function App() {
  return (
    <ErrorBoundary>
      <SystemSettingsBootstrapper />
      <QueryClientProvider client={queryClient}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* Backwards-compat: support /dashboard URL (some code still navigates there) */}
            {/* Dashboard redirect removed to allow specific route */}
            {/* Maintain backwards compatibility with old URLs */}
            <Route path="/video-buddy" element={<Navigate to="/video-room" replace />} />
            <Route path="/video-buddy/*" element={<Navigate to="/video-room" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/:slug/login" element={<Login />} />
            <Route path="/signup" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-900 text-white">Initializing...</div>}>
                <Signup />
              </Suspense>
            } />
            <Route path="/:slug/signup" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-900 text-white">Initializing...</div>}>
                <Signup />
              </Suspense>
            } />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/auth/callback/google" element={<OAuthCallback />} />
            <Route path="/auth/callback/github" element={<OAuthCallback />} />
            <Route path="/join/:roomCode" element={<JoinMeeting />} />
            <Route path="/workspace-entry" element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                    <WorkspaceEntry />
                  </Suspense>
                </ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="/select-workspace" element={<Navigate to="/workspace-entry" replace />} />
            {/* Public meeting route for guests - must be before PrivateRoute */}
            <Route path="/meeting/:roomId" element={
              <ErrorBoundary>
                <Meeting />
              </ErrorBoundary>
            } />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <RequireWorkspace>
                    <ErrorBoundary>
                      <SocketProvider>
                        <Suspense fallback={<div style={{ padding: 20 }}>Loading UI...</div>}>
                          <Layout />
                        </Suspense>
                      </SocketProvider>
                    </ErrorBoundary>
                  </RequireWorkspace>
                </PrivateRoute>
              }
            >
              <Route index element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading dashboard...</div>}>
                    <RootRedirect />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="dashboard" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading dashboard...</div>}>
                    <Dashboard />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="meeting/:roomId" element={
                <ErrorBoundary>
                  <Meeting />
                </ErrorBoundary>
              } />
              <Route path="chat" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading chat...</div>}>
                    <Chat />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="chat/:channelId" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading chat...</div>}>
                    <Chat />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="classes" element={
                <ErrorBoundary>
                  <Classes />
                </ErrorBoundary>
              } />
              <Route path="classes/:classId" element={
                <ErrorBoundary>
                  <ClassDetail />
                </ErrorBoundary>
              } />
              <Route path="classes/:classId/lessons/:lessonId" element={
                <ErrorBoundary>
                  <LessonDetail />
                </ErrorBoundary>
              } />
              <Route path="lessons/:lessonId/materials" element={
                <ErrorBoundary>
                  <LessonMaterials />
                </ErrorBoundary>
              } />
              <Route path="groups" element={
                <ErrorBoundary>
                  <Groups />
                </ErrorBoundary>
              } />
              <Route path="groups/join/:joinCode" element={
                <ErrorBoundary>
                  <Groups />
                </ErrorBoundary>
              } />
              <Route path="meetings" element={
                <ErrorBoundary>
                  <RecentMeetings />
                </ErrorBoundary>
              } />
              <Route path="profile" element={
                <ErrorBoundary>
                  <Profile />
                </ErrorBoundary>
              } />
              <Route path="settings" element={
                <ErrorBoundary>
                  <Settings />
                </ErrorBoundary>
              } />
              <Route path="analytics" element={
                <ErrorBoundary>
                  <Analytics />
                </ErrorBoundary>
              } />
              <Route path="study-room" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading Study Room...</div>}>
                    <StudyRoom />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="study-room/group" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading Group Study...</div>}>
                    <GroupStudy />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="study-room/tutoring" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading Peer Tutoring...</div>}>
                    <PeerTutoring />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="study-room/discussions" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading Discussions...</div>}>
                    <TopicDiscussions />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="study-room/live/:roomId/docs" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Entering Study Room...</div>}>
                    <StudyRoomLive />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="study-room/live/:roomId" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Entering Study Room...</div>}>
                    <StudyRoomLive />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="study-room/group/:groupId" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading Group...</div>}>
                    <StudyGroupDetail />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="study-room/assignment-group/:groupId" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading Room...</div>}>
                    <AssignmentGroupRoom />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="gpa" element={
                <ErrorBoundary>
                  <GpaCalculator />
                </ErrorBoundary>
              } />
              <Route path="video-room" element={
                <ErrorBoundary>
                  <VideoBuddy />
                </ErrorBoundary>
              }>
                <Route index element={<VideoBuddyHome />} />
                <Route path="calendar" element={<VideoCalendar />} />
                <Route path="recording" element={<VideoRecording />} />
                <Route path="meeting" element={<VideoMeeting />} />
                <Route path="contacts" element={<VideoContacts />} />
                <Route path="whiteboard" element={<Whiteboard />} />
              </Route>
              <Route path="settings/2fa" element={
                <ErrorBoundary>
                  <TwoFactor />
                </ErrorBoundary>
              } />
              <Route path="settings/sessions" element={
                <ErrorBoundary>
                  <Sessions />
                </ErrorBoundary>
              } />
              <Route path="direct-messages" element={
                <ErrorBoundary>
                  <DirectMessages />
                </ErrorBoundary>
              } />
              <Route path="direct-messages/:userId" element={
                <ErrorBoundary>
                  <DirectMessages />
                </ErrorBoundary>
              } />
              <Route path="feedback" element={
                <ErrorBoundary>
                  <Feedback />
                </ErrorBoundary>
              } />
              <Route path="admin/students" element={
                <ErrorBoundary>
                  <ManageStudents />
                </ErrorBoundary>
              } />
              <Route path="admin/users" element={
                <ErrorBoundary>
                  <ManageUsers />
                </ErrorBoundary>
              } />
              <Route path="admin/twofactor-audits" element={
                <ErrorBoundary>
                  <TwoFactorAudits />
                </ErrorBoundary>
              } />
              <Route path="admin/rooms" element={
                <ErrorBoundary>
                  <ManageRooms />
                </ErrorBoundary>
              } />
              <Route path="admin/classes" element={
                <ErrorBoundary>
                  <ManageClasses />
                </ErrorBoundary>
              } />
              <Route path="admin/groups" element={
                <ErrorBoundary>
                  <ManageGroups />
                </ErrorBoundary>
              } />
              <Route path="admin/settings" element={
                <ErrorBoundary>
                  <WorkspaceSettings />
                </ErrorBoundary>
              } />
              <Route path="admin/reports" element={
                <ErrorBoundary>
                  <SecurityAuditCenter />
                </ErrorBoundary>
              } />
              <Route path="admin/security" element={
                <ErrorBoundary>
                  <SecurityAuditCenter />
                </ErrorBoundary>
              } />
              <Route path="admin/system-admins" element={
                <ErrorBoundary>
                  <AdminManagement />
                </ErrorBoundary>
              } />
              <Route path="admin/creation-hub-audit" element={
                <ErrorBoundary>
                  <CreationHubAudit />
                </ErrorBoundary>
              } />
              <Route path="admin/creation-policy" element={
                <ErrorBoundary>
                  <CreationPolicyManager />
                </ErrorBoundary>
              } />
              <Route path="creation-hub" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Loading Creation Hub...</div>}>
                    <CreationHub />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="grading-hub" element={
                <ErrorBoundary>
                  <Suspense fallback={<div style={{ padding: 20 }}>Initializing Grading Hub...</div>}>
                    <GradingHub />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="assignment/:assignmentId/grading" element={
                <ErrorBoundary>
                  <AssignmentGrading />
                </ErrorBoundary>
              } />
            </Route>
            {/* Super Admin Control Plane Routes */}
            <Route path="/superadmin" element={
              <SuperAdminRoute>
                <SuperAdminLayout />
              </SuperAdminRoute>
            }>
              <Route path="control-center" element={<SuperAdminDashboard />} />
              <Route path="workspaces" element={<SuperAdminDashboard />} />
              <Route path="system-admins" element={<AdminManagement />} />
              <Route path="global-users" element={<ManageUsers />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<WorkspaceSettings />} />
              <Route path="settings/:workspaceId" element={<WorkspaceSettings />} />
              <Route path="platform-settings" element={<SettingsDashboard />} />
              <Route path="feature-lab" element={<FeatureLab />} />
              <Route path="security" element={<SecurityAuditCenter />} />
              <Route path="profile" element={<Profile />} />
              <Route path="preferences" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App

