import { useEffect, useRef, useState } from 'react';

interface Props {
  className?: string;
}

const COUNT = 8; // number of dots
const STEP = 300; // each dot changes color after 300ms
const HOLD = 0; // how long to keep full green (ms)
const GAP = 300; // rest between rounds

export default function Loader({ className }: Props) {
  const [mode, setMode] = useState<'forward' | 'backward'>('forward');
  const [active, setActive] = useState<number>(-1);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    runCycle();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function runCycle() {
    for (let i = 0; i < COUNT; i++) {
      if (!mountedRef.current) return;
      setMode('forward');
      setActive(i);
      await sleep(STEP);
    }

    await sleep(HOLD);

    for (let j = 0; j < COUNT; j++) {
      if (!mountedRef.current) return;
      setMode('backward');
      setActive(j + 1);
      await sleep(STEP);
    }

    // 🔹 Rest between rounds
    await sleep(GAP);

    // 🔁 Repeat
    if (mountedRef.current) {
      setMode('forward');
      setActive(-1);
      runCycle();
    }
  }

  function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  const dots = Array.from({ length: COUNT }).map((_, i) => {
    let bg = 'white';
    if (mode === 'forward') {
      if (i <= active) bg = '#0068B6';
    } else {
      if (i < active) bg = 'white';
      else bg = '#0068B6';
    }

    return (
      <div
        key={i}
        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
        style={{
          transform: `rotate(${i * (360 / COUNT)}deg) translate(24px)`,
          background: bg,
          transition: 'background 0.25s linear',
        }}
      />
    );
  });

  return (
    <div className={`relative w-[52px] h-[52px] ${className}`}>{dots}</div>
  );
}
