import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "violet" | "blue" | "green" | "amber" | "rose";
  delay?: number;
  loading?: boolean;
}

const colorVariants = {
  violet: {
    bg: "bg-violet-50 dark:bg-violet-900/20",
    icon: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    icon: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    icon: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    icon: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    icon: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
};

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "violet",
  loading = false,
}: StatCardProps) => {
  const colors = colorVariants[color];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-24 rounded bg-muted animate-pulse" />
          ) : (
            <p className="text-2xl font-bold animate-fade-in">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-3", colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Decorative gradient */}
      <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-gradient-to-br from-current to-transparent opacity-5" />
    </div>
  );
};

export default StatCard;
