"use client";

import type { KvkkDocument as Document } from "@/lib/kvkk";

export default function KvkkDocument({ document }: { document: Document }) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-(--text-primary) md:text-3xl">{document.title}</h2>
        <p className="text-sm text-(--text-muted)">{document.updated}</p>
      </header>

      {document.sections.map((section, index) => (
        <section key={section.heading || index} className="flex flex-col gap-3">
          {section.heading && (
            <h3 className="text-lg font-bold text-(--accent-bg)">{section.heading}</h3>
          )}

          {section.blocks.map((block, blockIndex) =>
            block.kind === "p" ? (
              <p key={blockIndex} className="text-(--text-secondary)">
                {block.text}
              </p>
            ) : (
              <ul key={blockIndex} className="flex list-disc flex-col gap-1.5 pl-5 text-(--text-secondary)">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )
          )}
        </section>
      ))}
    </article>
  );
}
