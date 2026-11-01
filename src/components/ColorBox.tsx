// Muestra una muestra visual del color recibido.
interface ColorBoxProps {
  color: string;
}

export default function ColorBox({ color }: ColorBoxProps) {
  return (
    <div
      className="color-box"
      style={{ backgroundColor: color }}
    ></div>
  );
}
