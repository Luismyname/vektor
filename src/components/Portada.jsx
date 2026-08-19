import Layout from "./Layout";

export default function Portada({ onOpenLogin, onOpenRegister }) {
  return (
    <Layout onOpenLogin={onOpenLogin} onOpenRegister={onOpenRegister}>
      <section className="hero">
        <h1 className="site-title">Vektor</h1>
        <p className="site-tagline">Un lugar con sentido y dirección</p>
      </section>
    </Layout>
  );
}
