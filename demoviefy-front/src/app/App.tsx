import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "../features/auth/AuthContext";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import GuestPage from "../pages/Guest";
import HomePage from "../pages/Home";
import LoginPage from "../pages/Login";
import AdminLabPage from "../pages/Upload";

function AppLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <AppLayout>
                <HomePage />
              </AppLayout>
            }
          />
          <Route
            path="/guest"
            element={
              <AppLayout>
                <GuestPage />
              </AppLayout>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/admin/lab"
              element={
                <AppLayout>
                  <AdminLabPage />
                </AppLayout>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
