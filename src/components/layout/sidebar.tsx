"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types/database";

interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["admin", "project_manager", "drp_procurement", "drp_estimator", "accounting", "warehouse"] },
  { label: "Projects", href: "/projects", roles: ["admin", "project_manager", "drp_procurement", "drp_estimator", "accounting"] },
  { label: "Suppliers", href: "/suppliers", roles: ["admin", "drp_procurement", "drp_estimator"] },
  { label: "Purchase Requests", href: "/purchase-requests", roles: ["admin", "project_manager", "drp_procurement", "accounting"] },
  { label: "Purchase Orders", href: "/purchase-orders", roles: ["admin", "drp_procurement", "accounting"] },
  { label: "Payments", href: "/payments", roles: ["admin", "accounting"] },
  { label: "Receiving", href: "/receiving", roles: ["admin", "project_manager", "drp_procurement", "warehouse"] },
];

interface SidebarProps {
  userRole: UserRole;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-5">
        <h1 className="text-lg font-bold text-primary">Delcom Hub</h1>
        <p className="mt-0.5 text-xs text-muted">Project & Procurement</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 px-6 py-4">
        <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
        <p className="text-xs text-muted capitalize">{userRole.replace(/_/g, " ")}</p>
      </div>
    </aside>
  );
}
