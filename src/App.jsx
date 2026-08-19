import { useEffect, useState } from "react";
import Portada from "./components/Portada";
import { supabase } from "./lib/supabase";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [authMode, setAuthMode] = useState(null); // "login" | "register" | null

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const signUp = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Registro correcto. Revisa tu email si tienes confirmación activada.");
      console.log("Usuario registrado:", data);
    }

    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Inicio de sesión correcto");
      console.log("Usuario logueado:", data);
      setAuthMode(null);
    }

    setLoading(false);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Sesión cerrada");
      setUser(null);
      setAuthMode(null);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <Portada
        onOpenLogin={() => setAuthMode("login")}
        onOpenRegister={() => setAuthMode("register")}
      />

      {authMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 12, 20, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{authMode === "register" ? "Registro" : "Inicio de sesión"}</h2>
              <button onClick={() => setAuthMode(null)} style={{ cursor: "pointer" }}>
                ✕
              </button>
            </div>

            {authMode === "register" && (
              <input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: 12, padding: 10 }}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: 12, padding: 10 }}
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: 12, padding: 10 }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              {authMode === "register" ? (
                <button onClick={signUp} disabled={loading} style={{ flex: 1, padding: 10, cursor: "pointer" }}>
                  {loading ? "..." : "Registrarse"}
                </button>
              ) : (
                <button onClick={signIn} disabled={loading} style={{ flex: 1, padding: 10, cursor: "pointer" }}>
                  {loading ? "..." : "Entrar"}
                </button>
              )}
            </div>

            {user && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eee" }}>
                <p style={{ margin: "0 0 12px" }}>Sesión activa para: {user.email}</p>
                <button onClick={signOut} style={{ padding: 10, cursor: "pointer" }}>
                  Cerrar sesión
                </button>
              </div>
            )}

            {message && <p style={{ marginTop: 16, color: "#333" }}>{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

