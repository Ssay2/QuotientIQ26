import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
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

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/chat/:agentId" element={<Protected><Chat /></Protected>} />
          <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
          <Route path="/builder" element={<Protected><Builder /></Protected>} />
          <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
          <Route path="/profile" element={<Protected><CompanyProfile /></Protected>} />
          <Route path="/org" element={<Protected><OrgChart /></Protected>} />
          <Route path="/billing" element={<Protected><Billing /></Protected>} />
          <Route path="/conversations" element={<Protected><Conversations /></Protected>} />
          <Route path="/embed/:token" element={<Embed />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
