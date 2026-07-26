type SectionCardProps = {
  title: string;
  description: string;
  items: string[];
};

export function SectionCard({ title, description, items }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-6 shadow-2xl shadow-black/20">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-textSoft">{description}</p>
      <ul className="mt-4 space-y-2 text-sm text-text">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-line/60 bg-panelSoft px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
