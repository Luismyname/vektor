import { useEffect, useRef, useState } from "react";

export default function BackgroundWords({ wordsList }) {
  const containerRef = useRef(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const words = wordsList || [
      "meta",
      "logros",
      "motivación",
      "constancia",
      "inspiración",
      "victorias",
      "resultados",
      "objetivos",
      "resiliencia",
    ];

    const interval = setInterval(() => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const minLeftPx = 20;
      const maxLeftPx = rect.width - 60;
      const minTopPx = 30;
      const maxTopPx = rect.height - 60;

      const leftPx = Math.floor(minLeftPx + Math.random() * (maxLeftPx - minLeftPx));
      const topPx = Math.floor(minTopPx + Math.random() * (maxTopPx - minTopPx));

      const left = (leftPx / rect.width) * 100;
      const top = (topPx / rect.height) * 100;

      const word = words[Math.floor(Math.random() * words.length)];
      const id = Date.now() + Math.random();

      const newItem = { id, word, left, top };
      setItems((s) => [...s, newItem]);

      // remove after animation
      setTimeout(() => {
        setItems((s) => s.filter((it) => it.id !== id));
      }, 6200);
    }, 1800);

    return () => clearInterval(interval);
  }, [wordsList]);

  return (
    <div ref={containerRef} className="background-words" aria-hidden>
      {items.map((it) => (
        <span
          key={it.id}
          className="floating-word"
          style={{ left: `${it.left}%`, top: `${it.top}%` }}
        >
          {it.word}
        </span>
      ))}
    </div>
  );
}
