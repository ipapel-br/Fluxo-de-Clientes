import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Prioridades from '@/pages/Prioridades';
import Fabrica from '@/pages/Fabrica';
import Concluidos from '@/pages/Concluidos';
import Admin from '@/pages/Admin';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoginDialog from '@/components/auth/LoginDialog';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Prioridades />} />
              <Route path="/impressao" element={<Fabrica />} />
              <Route path="/fabrica" element={<Navigate to="/impressao" replace />} />
              <Route path="/concluidos" element={<Concluidos />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          <Toaster />
          <LoginDialog />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

