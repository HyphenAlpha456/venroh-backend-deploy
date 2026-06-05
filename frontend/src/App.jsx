import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/auth/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import FounderDashboard from './pages/founder/FounderDashboard';
import CreateStartupPage from './pages/founder/CreateStartupPage';
import EditStartupPage from './pages/founder/EditStartupPage';
import PitchUpdatePage from './pages/founder/PitchUpdatePage';
import AvailabilityPage from './pages/founder/AvailabilityPage';

import InvestorDashboard from './pages/investor/InvestorDashboard';

import AdminDashboard from './pages/admin/AdminDashboard';

import ChatPage from './pages/chat/ChatPage';
import MeetingsPage from './pages/meetings/MeetingsPage';
import MeetingRoomPage from './pages/meetings/MeetingRoomPage';
import ChatInboxPage from './pages/chat/ChatInboxPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/founder"
        element={
          <ProtectedRoute allowedRoles={['founder']}>
            <FounderDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/founder/create-startup"
        element={
          <ProtectedRoute allowedRoles={['founder']}>
            <CreateStartupPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/founder/edit-startup"
        element={
          <ProtectedRoute allowedRoles={['founder']}>
            <EditStartupPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/founder/startups/:id/pitch"
        element={
          <ProtectedRoute allowedRoles={['founder']}>
            <PitchUpdatePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/founder/availability"
        element={
          <ProtectedRoute allowedRoles={['founder']}>
            <AvailabilityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/investor"
        element={
          <ProtectedRoute allowedRoles={['investor']}>
            <InvestorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute allowedRoles={['founder', 'investor']}>
            <ChatInboxPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat/:conversationId"
        element={
          <ProtectedRoute allowedRoles={['founder', 'investor']}>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/meetings"
        element={
          <ProtectedRoute allowedRoles={['founder', 'investor']}>
            <MeetingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/meeting/:roomId"
        element={
          <ProtectedRoute allowedRoles={['founder', 'investor']}>
            <MeetingRoomPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/meet/:roomId"
        element={
          <ProtectedRoute allowedRoles={['founder', 'investor']}>
            <MeetingRoomPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/meetings/:roomId"
        element={
          <ProtectedRoute allowedRoles={['founder', 'investor']}>
            <MeetingRoomPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;