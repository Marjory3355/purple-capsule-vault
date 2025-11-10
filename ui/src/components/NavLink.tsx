import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}

export const NavLink = ({ to, children, className, activeClassName }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(className, isActive && activeClassName)}
    >
      {children}
    </Link>
  );
};

