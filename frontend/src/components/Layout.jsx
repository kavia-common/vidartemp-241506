import React from "react";
import { NavLink } from "react-router-dom";
import { ShieldCheck, LayoutGrid, Server, FilePen, ShieldAlert } from "lucide-react";

const navItems = [
  { to: "/",           label: "Estate Overview",   Icon: LayoutGrid },
  { to: "/systems",    label: "System Explorer",    Icon: Server },
  { to: "/governance-trace", label: "Governance Trace", Icon: ShieldAlert },
  { to: "/amendments", label: "Amendment Console",  Icon: FilePen },
];

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-[#09090e] text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-slate-800 bg-[#0d0d14]">
        {/* Wordmark */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
          <ShieldCheck size={20} className="text-indigo-400" />
          <span className="text-sm font-semibold tracking-widest uppercase text-slate-100">
            Vidar
          </span>
          <span className="ml-auto text-[10px] text-slate-500 font-mono">v1.0</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-2 pt-4">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-5 pb-4 text-[10px] text-slate-600 font-mono">
          internal governance dashboard
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
