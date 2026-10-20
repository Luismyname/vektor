import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BackgroundWords from "./BackgroundWords";

// Layout público heredado con navegación, llamadas a autenticación y pie.
export default function Layout({ children, onOpenLogin, onOpenRegister }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Delega apertura de registro al consumidor o navega a la ruta correspondiente.
  function handleRegistroClick() {
    if (onOpenRegister) {
      onOpenRegister();
      return;
    }
    navigate("/register");
  }

  return (
    <div className="site-wrapper">
      <header className="top-header" aria-label="barra superior">
        <div className="header-left">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((s) => !s)}
            aria-expanded={menuOpen}
            aria-controls="public-menu"
          >
            ☰ Menu
          </button>
          {menuOpen && (
            <nav id="public-menu" className="menu-dropdown" aria-label="Navegación pública">
              <ul>
                <li><Link to="/demo" onClick={() => setMenuOpen(false)}>Demo</Link></li>
                <li><Link to="/preferences" onClick={() => setMenuOpen(false)}>Configuración</Link></li>
                <li><Link to="/help" onClick={() => setMenuOpen(false)}>Ayuda</Link></li>
              </ul>
            </nav>
          )}
        </div>

        <div className="header-right">
          <div id="botones-inicio" className="login-cta">
            <button id="inicio" onClick={() => (onOpenLogin ? onOpenLogin() : navigate("/login"))}>
              Inicio de sesión
            </button>
            <button id="registro" onClick={handleRegistroClick}>
              Registro
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">
        <BackgroundWords />
        {pathname !== "/" && (
          <Link className="public-home-link" to="/" onClick={() => setMenuOpen(false)}>
            ← Volver al inicio
          </Link>
        )}
        {children}
      </div>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>Vektor</span>
          <span>Proyecto de Luis Guillermo Rodríguez Velásquez</span>
          <a href="https://github.com/Luismyname/" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://www.linkedin.com/in/luis-guillermo-rodriguez-velasquez-786a83b6" target="_blank" rel="noreferrer">LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}
