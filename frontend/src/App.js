import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import Protected from "@/components/Protected";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Marketplace from "@/pages/Marketplace";
import Builder from "@/pages/Builder";
import Analytics from "@/pages/Analytics";
import Billing from "@/pages/Billing";
import Embed from "@/pages/Embed";
import Conversations from "@/pages/Conversations";
import CompanyProfile from "@/pages/CompanyProfile";
import OrgChart from "@/pages/OrgChart";
import Team from "@/pages/Team";
import AuditLogs from "@/pages/AuditLogs";
import Developer from "@/pages/Developer";
import Settings from "@/pages/Settings";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import Help from "@/pages/Help";
import Industries from "@/pages/Industries";
import AIWorkforce from "@/pages/AIWorkforce";
import Departments from "@/pages/Departments";
import ChiefOfStaff from "@/pages/ChiefOfStaff";
import Activity from "@/pages/Activity";
import { NotFound, Forbidden, ServerError, Maintenance } from "@/pages/Errors";

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
            <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
            <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/chief" element={<Protected><ChiefOfStaff /></Protected>} />
            <Route path="/workforce" element={<Protected><AIWorkforce /></Protected>} />
            <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
            <Route path="/industries" element={<Protected><Industries /></Protected>} />
            <Route path="/departments" element={<Protected><Departments /></Protected>} />
            <Route path="/chat/:agentId" element={<Protected><Chat /></Protected>} />
            <Route path="/builder" element={<Protected><Builder /></Protected>} />
            <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
            <Route path="/profile" element={<Protected><CompanyProfile /></Protected>} />
            <Route path="/org" element={<Protected><OrgChart /></Protected>} />
            <Route path="/billing" element={<Protected><Billing /></Protected>} />
            <Route path="/conversations" element={<Protected><Conversations /></Protected>} />
            <Route path="/team" element={<Protected><Team /></Protected>} />
            <Route path="/audit" element={<Protected><AuditLogs /></Protected>} />
            <Route path="/activity" element={<Protected><Activity /></Protected>} />
            <Route path="/developer" element={<Protected><Developer /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/help" element={<Protected><Help /></Protected>} />
            <Route path="/embed/:token" element={<Embed />} />
            <Route path="/403" element={<Forbidden />} />
            <Route path="/500" element={<ServerError />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="bottom-right" />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
