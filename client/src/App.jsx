import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './api/AuthContext';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import MentorDashboard from './pages/MentorDashboard';

function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'mentor' ? '/mentor' : '/student'} replace />;
  return children;
}

function Routed() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'mentor' ? '/mentor' : '/student'} /> : <Auth />} />
      <Route path="/student" element={<Protected role="student"><StudentDashboard /></Protected>} />
      <Route path="/mentor" element={<Protected role="mentor"><MentorDashboard /></Protected>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routed />
      </BrowserRouter>
    </AuthProvider>
  );
}
