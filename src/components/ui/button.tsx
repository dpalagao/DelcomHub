import { ButtonHTMLAttributes, forwardRef } from "react";

const VARIANT_CLASSES = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  danger: "bg-danger text-white hover:bg-red-700",
  ghost: "text-gray-600 hover:bg-gray-100",
  success: "bg-success text-white hover:bg-green-700",
} as const;

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
