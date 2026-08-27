import { Toaster } from "@/components/ui/toaster"
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Prioridades from '@/pages/Prioridades';
import Concluidos from '@/pages/Concluidos';
// Add page imports here


function App() {

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Prioridades />} />
          <Route path="/concluidos" element={<Concluidos />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <Toaster />
    </Router>
  )
}

export default App
