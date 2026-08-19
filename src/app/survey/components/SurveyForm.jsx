export default function SurveyForm() {
  return (
    <form className="bg-neutral-900 p-6 rounded-xl max-w-md mx-auto">
      <h2 className="text-xl mb-4">Encuesta</h2>
      <input className="w-full p-2 mb-4 bg-neutral-800 rounded" placeholder="Tu nombre" />
      <textarea className="w-full p-2 mb-4 bg-neutral-800 rounded" placeholder="Tu opinión" />
      <button className="bg-white text-black px-4 py-2 rounded">Enviar</button>
    </form>
  )
}
