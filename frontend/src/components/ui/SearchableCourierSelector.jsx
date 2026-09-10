import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Loader2 } from "lucide-react";
import { listEmployees } from "../../pages/company-admin/employees/services/employeeService";

export default function SearchableCourierSelector({
  value,
  onChange,
  initialCourierName = "",
  error = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState(initialCourierName || "");

  const containerRef = useRef(null);

  // Sync initial label text
  useEffect(() => {
    if (initialCourierName) {
      setSelectedName(initialCourierName);
    } else if (!value) {
      setSelectedName("Leave Unassigned (Pending Assignment Queue)");
    }
  }, [initialCourierName, value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Couriers from API
  const fetchCouriers = async () => {
    setLoading(true);
    try {
      // Load available couriers using search query
      const res = await listEmployees(searchQuery, "employee", "true", 1);
      const results = res.results || [];
      setCouriers(results);

      // If there is an active selection, look up and cache the display name
      if (value) {
        const matched = results.find((c) => c.id === value);
        if (matched) {
          setSelectedName(matched.full_name);
        }
      }
    } catch (err) {
      console.error("Failed to load couriers", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search with 300ms debounce
  useEffect(() => {
    if (!isOpen) return;

    const delayDebounce = setTimeout(() => {
      fetchCouriers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen]);

  const handleSelect = (courier) => {
    if (courier === null) {
      onChange("");
      setSelectedName("Leave Unassigned (Pending Assignment Queue)");
    } else {
      onChange(courier.id);
      setSelectedName(courier.full_name);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 h-11 rounded-xl border border-slate-200 flex items-center justify-between bg-white text-sm font-semibold cursor-pointer outline-none hover:border-slate-300"
      >
        <span className={value ? "text-slate-800" : "text-slate-500"}>
          {value ? selectedName : "Search courier by name..."}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 flex flex-col">
          
          {/* Search Input field */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none text-xs font-semibold text-slate-700 placeholder-slate-400"
            />
            {loading && <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />}
          </div>

          {/* List Options */}
          <div className="overflow-y-auto flex-1 py-1 divide-y divide-slate-50">
            
            {/* Unassigned selection option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full px-4 py-2 text-left text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              Leave Unassigned (Pending Assignment Queue)
            </button>

            {/* List of active couriers */}
            {couriers.length === 0 && !loading ? (
              <div className="p-4 text-center text-slate-400 text-xs font-semibold">
                No couriers found
              </div>
            ) : (
              couriers.map((drv) => (
                <button
                  key={drv.id}
                  type="button"
                  onClick={() => handleSelect(drv)}
                  className={`w-full px-4 py-2 text-left text-xs font-semibold transition-colors cursor-pointer
                    ${value === drv.id ? "bg-emerald-50 text-emerald-700 font-bold" : "hover:bg-slate-50 text-slate-700"}
                  `}
                >
                  {drv.full_name} ({drv.availability} | {drv.active_orders} Active | {drv.completed_today} Completed today)
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
