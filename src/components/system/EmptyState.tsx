export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="state-box" aria-label={title}>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
