export default function ColorBox({ color }) {
  return (
    <div
      style={{
        width: "150px",
        height: "150px",
        backgroundColor: color,
        borderRadius: "10px",
        border: "2px solid #000"
      }}
    ></div>
  );
}
