'use client';
import { useState, useEffect, useRef } from 'react';
import { TaskDuration } from '@interfaces/task';

const defaultTextTime = '00:00:00';
const useContinueCounterTime = (statusTaskSelected: TaskDuration) => {
  const [elapsedTime, setElapsedTime] = useState(
    statusTaskSelected.taskDuration || defaultTextTime,
  );

  const startTimeRef = useRef(Date.now());

  const elapsedSecondsRef = useRef(
    parseTimeToSeconds(statusTaskSelected.taskDuration || defaultTextTime),
  );

  useEffect(() => {
    elapsedSecondsRef.current = parseTimeToSeconds(
      statusTaskSelected.taskDuration,
    );
    setElapsedTime(statusTaskSelected.taskDuration);
    if (statusTaskSelected.isStart) {
      startTimeRef.current = Date.now() - elapsedSecondsRef.current * 1000;

      const intervalId = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        elapsedSecondsRef.current = elapsed;
        setElapsedTime(formatTime(elapsed));
      }, 1000);

      return () => clearInterval(intervalId);
    } else {
      const initialSeconds = parseTimeToSeconds(
        statusTaskSelected.taskDuration || defaultTextTime,
      );
      elapsedSecondsRef.current = initialSeconds;
      setElapsedTime(statusTaskSelected.taskDuration || defaultTextTime);
    }
  }, [statusTaskSelected]);

  return elapsedTime;
};

const parseTimeToSeconds = (timeStr: string) => {
  if (!timeStr) {
    return 0;
  }
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(secs).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

export default useContinueCounterTime;
