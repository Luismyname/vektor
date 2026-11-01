// Pie reutilizable de la aplicación con clases adicionales opcionales.
interface FooterProps {
  className?: string
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`site-footer bg-neutral-900 text-white p-4 text-center mt-10 ${className}`}>
      Vektor © 2026
    </footer>
  )
}
