// Muestra una muestra visual del color recibido.
export default function ColorBox({ color }) {
  return (
    <div
      className="color-box"
      style={{ backgroundColor: color }}
    ></div>
  );
}
