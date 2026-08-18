import { useState } from "react";
import BackgroundWords from "./BackgroundWords";

export default function Layout({ children }) {
  const [inicio, setInicio] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleInicioClick() {
    setInicio(!inicio);
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
          {inicio ? (
            <form
              id="formulario-inicio"
              className="login-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input type="text" placeholder="Usuario" />
              <input type="password" placeholder="Contraseña" />
              <div className="login-actions">
                <button type="submit">Entrar</button>
                <button type="button" onClick={handleInicioClick}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div id="botones-inicio" className="login-cta">
              <button id="inicio" onClick={handleInicioClick}>
                Inicio de sesión
              </button>
              <button id="registro">Registro</button>
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
          <a href="#">@luis Rodriguez</a>
          <a href="#">GitHub</a>
          <a href="#">LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}
