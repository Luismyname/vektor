import Hero from './components/Hero'

// Entrada de la portada pública, delegada al componente Hero.
export default function Landing() {
  return (
    <div className="bg-black text-white min-h-screen">
      <Hero />
    </div>
  )
}
