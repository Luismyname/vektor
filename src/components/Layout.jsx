import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundWords from "./BackgroundWords";
import { signIn } from "../services/auth";

export default function Layout({ children, onOpenRegister }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  function handleRegistroClick() {
    if (onOpenRegister) {
      onOpenRegister();
      return;
    }
    navigate("/register");
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const { error } = await signIn(loginEmail, loginPassword);

    setIsLoggingIn(false);

    if (error) {
      setLoginError("La contraseña o el usuario son incorrectos.");
      return;
    }

    setLoginOpen(false);
    setLoginEmail("");
    setLoginPassword("");
    navigate("/dashboard");
  }

  function handleLoginChange(setValue) {
    return (event) => {
      setValue(event.target.value);
      setLoginError("");
    };
  }

  function handleLoginCancel() {
    setLoginOpen(false);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
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
            <form id="formulario-inicio" className="login-form" onSubmit={handleLoginSubmit}>
              <input
                type="email"
                placeholder="Correo electrónico"
                aria-label="Correo electrónico"
                value={loginEmail}
                onChange={handleLoginChange(setLoginEmail)}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                aria-label="Contraseña"
                value={loginPassword}
                onChange={handleLoginChange(setLoginPassword)}
                required
              />
              <div className="login-actions">
                <button type="submit" disabled={isLoggingIn}>
                  {isLoggingIn ? "Comprobando..." : "Iniciar"}
                </button>
                <button type="button" onClick={handleLoginCancel} disabled={isLoggingIn}>Cancelar</button>
              </div>
              {loginError && <p className="login-error" role="alert">{loginError}</p>}
            </form>
          ) : (
            <div id="botones-inicio" className="login-cta">
              <button id="inicio" onClick={() => setLoginOpen(true)}>
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
          <a href="#">@luis Rodriguez</a>
          <a href="#">GitHub</a>
          <a href="#">LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}
