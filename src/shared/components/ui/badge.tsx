import type { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={`ui-badge ui-badge-${variant} ${className}`.trim()}
      {...props}
    />
  );
}
