import type { ReactNode } from 'react';

type PagePlaceholderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PagePlaceholder({ eyebrow, title, description, children }: PagePlaceholderProps) {
  return (
    <section className="page-card" aria-label={title}>
      <header className="page-head">
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </header>
      {children ? <div className="page-extra">{children}</div> : null}
    </section>
  );
}
