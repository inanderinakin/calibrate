"use client";

interface Section {
  heading: string;
  body: string[];
  note: string;
  list: string[];
}

export default function LegalDocument({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: readonly Section[];
}) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-(--text-primary) md:text-4xl">{title}</h1>
        <p className="text-sm text-(--text-muted)">{updated}</p>
        <p className="mt-2 text-(--text-secondary)">{intro}</p>
      </header>

      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-(--accent-bg)">{section.heading}</h2>

          {section.body.map((paragraph) => (
            <p key={paragraph} className="text-(--text-secondary)">
              {paragraph}
            </p>
          ))}

          {section.list.length > 0 && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-(--text-secondary)">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          {section.note && <p className="text-(--text-secondary)">{section.note}</p>}
        </section>
      ))}
    </article>
  );
}
