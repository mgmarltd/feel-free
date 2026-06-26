import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import Activity from "./pages/Activity";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/users/:userId" element={<ProtectedRoute><UserDetail /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
