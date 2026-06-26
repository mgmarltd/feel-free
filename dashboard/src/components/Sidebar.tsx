import { NavLink } from "react-router-dom";
import { IconGrid, IconUsers, IconActivity, IconPrompt, IconCheck, IconSpark, IconBook, IconBell } from "./icons";
import type { ComponentType } from "react";

interface Item {
  to: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const items: Item[] = [
  { to: "/overview", label: "Overview", Icon: IconGrid },
  { to: "/users", label: "Users", Icon: IconUsers },
  { to: "/activity", label: "Activity", Icon: IconActivity },
  { to: "/prompts", label: "Prompts", Icon: IconPrompt },
  { to: "/quick-sessions", label: "Quick Sessions", Icon: IconSpark },
  { to: "/homeworks", label: "Homeworks", Icon: IconBook },
  { to: "/daily-tasks", label: "Daily Tasks", Icon: IconCheck },
  { to: "/notifications", label: "Notifications", Icon: IconBell },
];

export function Sidebar({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="mt-4 flex flex-col gap-0.5">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `nav-item ${isActive ? "nav-item-active" : ""} ${collapsed ? "lg:justify-center lg:px-2" : ""}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`h-5 w-5 ${isActive ? "text-brand-600" : "text-gray-400"}`} />
              <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
