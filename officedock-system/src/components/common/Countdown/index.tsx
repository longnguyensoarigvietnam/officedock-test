import React, { useEffect, useRef, useState } from 'react';

type CountdownProps = {
  second: number;
  onFinish?: () => void;
  templateRender?: string;
};

const Countdown = ({ second, onFinish, templateRender }: CountdownProps) => {
  const timer = useRef<number>(0);
  const [count, setCount] = useState(second);

  useEffect(() => {
    timer.current = setInterval(() => {
      setCount((prev) => prev - 1);
    }, 1000) as unknown as number;

    return () => clearInterval(timer.current);
  }, []);

  useEffect(() => {
    if (count === 0) {
      clearInterval(timer.current);
      if (onFinish) {
        onFinish();
      }
    }
  }, [count]);

  return (
    <div style={{ transition: 'all 1s cubic-bezier(1,0,0,1)' }}>
      {templateRender
        ? templateRender.replaceAll('{second}', count > 0 ? `${count}` : '')
        : count > 0
          ? count
          : ''}
    </div>
  );
};

export default Countdown;
