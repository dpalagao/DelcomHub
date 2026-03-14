import { Card, CardContent } from "./card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const VARIANT_CLASSES = {
  default: "text-gray-900",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export function StatCard({ label, value, subtitle, variant = "default" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm text-muted">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${VARIANT_CLASSES[variant]}`}>
          {value}
        </p>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
