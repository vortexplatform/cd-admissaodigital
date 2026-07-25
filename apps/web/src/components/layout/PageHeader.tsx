import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

// DESIGN.md: eyebrow em sentence case (sem all-caps com tracking);
// titulos na escala display com tracking negativo.
export default function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-eyebrow text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-2 text-headline lg:text-display-md">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row">{actions}</div>}
    </section>
  );
}
