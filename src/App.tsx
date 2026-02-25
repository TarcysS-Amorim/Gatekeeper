import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PortariaPage from "@/pages/PortariaPage";
import VeiculosPage from "@/pages/VeiculosPage";
import ArmariosPage from "@/pages/ArmariosPage";
import EnergiaPage from "@/pages/EnergiaPage";
import UsuariosPage from "@/pages/UsuariosPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout><DashboardPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/portaria" element={
              <ProtectedRoute>
                <AppLayout><PortariaPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/veiculos" element={
              <ProtectedRoute>
                <AppLayout><VeiculosPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/armarios" element={
              <ProtectedRoute>
                <AppLayout><ArmariosPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/energia" element={
              <ProtectedRoute>
                <AppLayout><EnergiaPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute>
                <AppLayout><UsuariosPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
