import { NavLink, useLocation } from "react-router-dom";
import { Lock, Home, DollarSign, Briefcase, BarChart3, LayoutDashboard } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";

const Header = () => {
  const { isConnected } = useAccount();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/submit", label: "Submit", icon: DollarSign, requiresAuth: true },
    { path: "/manage", label: "My Data", icon: Briefcase, requiresAuth: true },
    { path: "/stats", label: "Statistics", icon: BarChart3, requiresAuth: true },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresAuth: true },
  ];

  return (
    <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Salary Vault
              </h1>
              <p className="text-xs text-muted-foreground">Privacy-Preserving Salary</p>
            </div>
          </NavLink>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.requiresAuth && !isConnected) return null;
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Wallet Button */}
          <div className="flex items-center gap-4">
            <WalletButton />
          </div>
        </div>

        {/* Mobile Navigation */}
        {isConnected && (
          <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            {navItems.map((item) => {
              if (item.requiresAuth && !isConnected) return null;
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                    isActive
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
