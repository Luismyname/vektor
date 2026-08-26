import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundWords from "./BackgroundWords";

export default function Layout({ children, onOpenLogin, onOpenRegister }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

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
            className="menu-toggle"
            onClick={() => setMenuOpen((s) => !s)}
            aria-expanded={menuOpen}
          >
            ☰ Menu
          </button>
          {menuOpen && (
            <nav className="menu-dropdown">
              <ul>
                <li>Perfil</li>
                <li>Configuración</li>
                <li>Ayuda</li>
              </ul>
            </nav>
          )}
        </div>

        <div className="header-right">
          {loginOpen ? (
            <div className="login-actions">
              <button type="button" onClick={() => navigate("/login")}>Continuar al inicio</button>
              <button type="button" onClick={() => setLoginOpen(false)}>Cancelar</button>
            </div>
          ) : (
            <div id="botones-inicio" className="login-cta">
              <button id="inicio" onClick={() => (onOpenLogin ? onOpenLogin() : setLoginOpen(true))}>
                Inicio de sesión
              </button>
              <button id="registro" onClick={handleRegistroClick}>
                Registro
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        <BackgroundWords />
        {children}
      </main>

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
