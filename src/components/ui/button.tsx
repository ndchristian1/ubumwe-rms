import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600',
      secondary: 'bg-slate-700 text-white hover:bg-slate-600',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      ghost: 'text-slate-300 hover:bg-slate-800',
      outline: 'border border-slate-600 text-slate-200 hover:bg-slate-800',
    };
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' };
    return (
      <button
        ref={ref}
        className={cn('rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
