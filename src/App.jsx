import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './app/dashboard'
import Survey from './app/survey'
import Login from './app/auth/login'
import Register from './app/auth/register'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Portada from './components/Portada'
import './Style/Estilo.css'

function PageLayout({ children, showNavbar = true }) {
  return (
    <>
      {showNavbar && <Navbar />}
      {children}
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portada />} />
        <Route path="/dashboard" element={<PageLayout><Dashboard /></PageLayout>} />
        <Route path="/survey" element={<PageLayout><Survey /></PageLayout>} />
        <Route path="/login" element={<PageLayout><Login /></PageLayout>} />
        <Route path="/register" element={<PageLayout showNavbar={false}><Register /></PageLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
