"use client";

interface NavbarProps {
  active: string;
  setActive: (value: string) => void;
}

export function Navbar({ active, setActive }: NavbarProps) {
  const navItems = [
    { id: "reports", label: "Usage Reports" },
    { id: "alerts", label: "Alerts & Notifications" },
    { id: "analytics", label: "Data Analytics" },
  ];

  return (
    <div className="flex justify-center gap-6 bg-gray-900/60 border border-gray-800 rounded-xl p-4 backdrop-blur-md">

      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActive(item.id)}
          className={`px-6 py-2 rounded-lg transition-all duration-300
            ${
              active === item.id
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
        >
          {item.label}
        </button>
      ))}
      
    </div>
  );
}