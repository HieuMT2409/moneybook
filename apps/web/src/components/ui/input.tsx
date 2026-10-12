import * as React from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, 'h-10', className)} {...props} />,
);
Input.displayName = 'Input';

// Native <select>: accessible, mobile-friendly and works directly with react-hook-form's register().
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(base, 'h-10 pr-8', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
