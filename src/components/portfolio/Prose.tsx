// Thin wrapper that applies the `.prose-editorial` token set from
// portfolio.css. Kept as its own component so future variants (wide-prose,
// sidebar-prose) can be added without threading ClassName props through
// every call site.

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="prose-editorial">{children}</div>;
}
