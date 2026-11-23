import type { ComponentPropsWithoutRef, ElementType } from 'react';

type CardProps = ComponentPropsWithoutRef<'div'> & {
  as?: ElementType;
};

export function Card({ as: Component = 'div', className = '', ...props }: CardProps) {
  return <Component data-slot="card" className={`ui-card ${className}`.trim()} {...props} />;
}

export function CardHeader({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div data-slot="card-header" className={`ui-card-header ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = '', ...props }: ComponentPropsWithoutRef<'h3'>) {
  return <h3 data-slot="card-title" className={`ui-card-title ${className}`.trim()} {...props} />;
}

export function CardDescription({ className = '', ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p data-slot="card-description" className={`ui-card-description ${className}`.trim()} {...props} />;
}

export function CardContent({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div data-slot="card-content" className={`ui-card-content ${className}`.trim()} {...props} />;
}

export function CardFooter({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div data-slot="card-footer" className={`ui-card-footer ${className}`.trim()} {...props} />;
}
