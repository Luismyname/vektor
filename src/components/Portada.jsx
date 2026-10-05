import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

// Construye la portada y proporciona navegación de acceso/registro al layout.
export default function Portada({ onOpenLogin, onOpenRegister }) {
  const navigate = useNavigate();

  return (
    <Layout onOpenLogin={onOpenLogin || (() => navigate('/login'))} onOpenRegister={onOpenRegister}>
      <section className="hero">
        <h1 className="site-title">Vektor</h1>
        <p className="site-tagline">Un lugar con sentido y dirección</p>
      </section>
    </Layout>
  );
}
