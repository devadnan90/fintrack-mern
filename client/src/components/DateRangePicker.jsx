import { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";
export default function DateRangePicker({ ranges, selectedKey, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = ranges.find((r) => r.key === selectedKey) || ranges[0];
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        {selected.display || selected.label}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                onChange(r.key);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${r.key === selectedKey ? "text-brand-700 font-medium" : "text-gray-700 dark:text-gray-300"}`}
            >
              {r.label}
              {r.key === selectedKey && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
