import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './utility/AuthContext';
import ProtectedRoute, { NotFoundRedirect } from './utility/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import Dashboard from './pages/student/Dashboard';
import ActiveJobs from './pages/student/ActiveJobs';
import AppliedJobs from './pages/student/AppliedJobs';
import EditProfile from './pages/student/EditProfile';
import CDashboard from './pages/company/CDashboard';
import CUpdate from './pages/company/CUpdate';
import CPostdrives from './pages/company/CPostdrives';
import CDriveapplication from './pages/company/CDriveapplication';
import { CCurrentdrives } from './pages/company/CCurrentdrives';
import ADashboard from './pages/admin/ADashboard';
import Adminactivedrive from './pages/admin/Adminactivedrive';
import Companies from './pages/admin/Companies';
import Studentprofile from './pages/admin/Studentprofile';
import Placements from './pages/admin/Placements';
import Notices from './pages/admin/Notices';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Each area is only reachable with a server-verified session of that role */}
          <Route element={<ProtectedRoute roles={['student']} />}>
            <Route path="/student" element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="active-jobs" element={<ActiveJobs />} />
              <Route path="applied-jobs" element={<AppliedJobs />} />
              <Route path="shortlisted-jobs" element={<AppliedJobs shortlistedOnly />} />
              <Route path="edit-profile" element={<EditProfile />} />
              <Route path="complete-profile" element={<Navigate to="/student/edit-profile" replace />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFoundRedirect />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['company']} />}>
            <Route path="/company" element={<AppShell />}>
              <Route index element={<CDashboard />} />
              <Route path="update-profile" element={<CUpdate />} />
              <Route path="post-drive" element={<CPostdrives />} />
              <Route path="current-drives" element={<CCurrentdrives />} />
              <Route path="drive-application" element={<CDriveapplication />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFoundRedirect />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AppShell />}>
              <Route index element={<ADashboard />} />
              <Route path="students" element={<Studentprofile />} />
              <Route path="companies" element={<Companies />} />
              <Route path="active-drives" element={<Adminactivedrive />} />
              <Route path="placements" element={<Placements />} />
              <Route path="notices" element={<Notices />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFoundRedirect />} />
            </Route>
          </Route>

          {/* Any other URL falls back to the login page */}
          <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
