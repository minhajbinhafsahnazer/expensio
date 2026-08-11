import React, { useEffect, useRef, useState } from "react";
import { cn } from "../utils";

export interface DateSliderProps {
  selectedDate: string; // YYYY-MM-DD format
  onSelectDate: (date: string) => void;
  className?: string;
}

export const DateSlider: React.FC<DateSliderProps> = ({ selectedDate, onSelectDate, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const [dates, setDates] = useState<{ date: string; dayName: string; dayNum: number }[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Generate dates: 30 days past, 7 days future
    const today = new Date();
    const newDates = [];
    for (let i = -30; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      newDates.push({ date: isoDate, dayName, dayNum });
    }
    setDates(newDates);
    // Allow a small delay before triggering the first scroll to ensure layout is computed
    setTimeout(() => setIsReady(true), 10);
  }, []);

  // Center selected item
  useEffect(() => {
    if (isReady && selectedItemRef.current && containerRef.current) {
      const container = containerRef.current;
      const selected = selectedItemRef.current;
      const containerCenter = container.offsetWidth / 2;
      const selectedCenter = selected.offsetLeft + selected.offsetWidth / 2;
      container.scrollTo({
        left: selectedCenter - containerCenter,
        behavior: "smooth"
      });
    }
  }, [selectedDate, dates, isReady]);

  return (
    <div className={cn("relative w-full overflow-hidden select-none", className)}>
      {/* Left Fade */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      
      {/* Right Fade */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div 
        ref={containerRef}
        className="flex items-center overflow-x-auto scroll-smooth gap-4 px-10 py-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Hide webkit scrollbar via inline styles or tailwind plugin (we assume no-scrollbar or inline style handles it) */}
        <style dangerouslySetInnerHTML={{__html: `
          div::-webkit-scrollbar { display: none; }
        `}} />
        
        {dates.map((d) => {
          const isSelected = d.date === selectedDate;
          return (
            <button
              key={d.date}
              type="button"
              ref={isSelected ? selectedItemRef : null}
              onClick={() => onSelectDate(d.date)}
              className="flex flex-col items-center justify-center min-w-[36px] gap-1 cursor-pointer transition-transform active:scale-95"
            >
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                isSelected ? "text-slate-900" : "text-slate-400"
              )}>
                {d.dayName}
              </span>
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                isSelected 
                  ? "bg-slate-900 text-white shadow-md scale-110" 
                  : "bg-transparent text-slate-600 hover:bg-slate-100"
              )}>
                {d.dayNum}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
