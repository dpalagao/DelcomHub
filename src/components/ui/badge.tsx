const VARIANT_CLASSES = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-cyan-100 text-cyan-700",
} as const;

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Status-to-variant mapping for common statuses
export function getStatusVariant(
  status: string
): keyof typeof VARIANT_CLASSES {
  switch (status) {
    case "draft":
      return "default";
    case "active":
    case "approved":
    case "confirmed":
    case "matched":
    case "completed":
    case "paid":
    case "fully_received":
      return "success";
    case "submitted":
    case "pending":
    case "pending_approval":
    case "open":
    case "evaluating":
      return "primary";
    case "on_hold":
    case "partially_received":
    case "qty_variance":
    case "price_variance":
      return "warning";
    case "rejected":
    case "cancelled":
    case "failed":
    case "closed":
    case "unmatched":
      return "danger";
    case "released":
    case "awarded":
    case "converted_to_po":
      return "info";
    default:
      return "default";
  }
}
