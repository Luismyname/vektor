import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-neutral-900 text-white p-4 flex gap-6">
      <Link to="/">Inicio</Link>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/profile">Perfil y configuración</Link>
      <Link to="/login">Login</Link>
    </nav>
  )
}
