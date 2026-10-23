
import type { ReactNode } from "react";
import SidebarAdmin from "@/components/SidebarAdmin";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <SidebarAdmin />

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
