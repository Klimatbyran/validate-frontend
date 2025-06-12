import moment from "moment";
import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

export interface RunningClockProps {
  startedAt?: number;
  finishedAt?: number;
}

export function RunningClock({startedAt, finishedAt}: RunningClockProps) {
  const [time, setTime] = useState(moment.duration(moment(finishedAt ?? Date.now()).diff(startedAt)));
  useEffect(() => {
    if(!finishedAt) {
      const interval = setInterval(() => {
        setTime(moment.duration(moment(Date.now()).diff(startedAt)));
      }, 1000);
      return () => clearInterval(interval);
    }
    return;
  }, [startedAt, finishedAt]);

  return (
    <div className="flex items-center">
      <Timer className="w-4 h-4 me-1 mb-1"></Timer>
      <span>{String(time.hours()).padStart(2, '0')}:{String(time.minutes()).padStart(2, '0')}:{String(time.seconds()).padStart(2, '0')}</span>
    </div>
  )
}