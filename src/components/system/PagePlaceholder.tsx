import type { ReactNode } from 'react';
type PagePlaceholderProps = {
    eyebrow?: string;
    title: string;
    description: string;
    children?: ReactNode;
};
export function PagePlaceholder({ eyebrow, title, description, children }: PagePlaceholderProps) {
    const hasDescription = description.trim().length > 0;
    return (<section className="page-card" aria-label={title}>
      <header className="page-head">
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {hasDescription ? <p className="page-description">{description}</p> : null}
      </header>
      {children ? <div className="page-extra">{children}</div> : null}
    </section>);
}
