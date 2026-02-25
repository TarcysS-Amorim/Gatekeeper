import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Shield, LayoutDashboard, ClipboardList, Car, Lock,
  Zap, Users, Menu, X, LogOut, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/portaria", icon: ClipboardList, label: "Controle de Portaria" },
  { href: "/veiculos", icon: Car, label: "Veículos" },
  { href: "/armarios", icon: Lock, label: "Armários" },
  { href: "/energia", icon: Zap, label: "Queda de Energia" },
  { href: "/usuarios", icon: Users, label: "Usuários", adminOnly: true },
];

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  admin: { label: "Admin", variant: "destructive" },
  supervisor: { label: "Supervisor", variant: "default" },
  doorman: { label: "Porteiro", variant: "secondary" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredItems = navItems.filter(item => !item.adminOnly || role === "admin");

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-sidebar-primary rounded-lg p-2">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sidebar-foreground text-sm">Gatekeeper</p>
            <p className="text-xs text-sidebar-foreground/50">Portaria</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map(({ href, icon: Icon, label }) => {
          const active = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent mb-2">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center text-sidebar-foreground text-xs font-bold flex-shrink-0">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sidebar-foreground truncate">{user?.email}</p>
            {role && (
              <Badge variant={roleLabels[role]?.variant ?? "secondary"} className="text-xs mt-0.5 h-4">
                {roleLabels[role]?.label}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 sidebar-gradient flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full sidebar-gradient animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center px-4 border-b border-border bg-card shadow-sm flex-shrink-0">
          <button
            className="lg:hidden mr-3 text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h2 className="font-semibold text-foreground text-sm">
            {filteredItems.find(i => i.href === location.pathname)?.label ?? "Gatekeeper"}
          </h2>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
