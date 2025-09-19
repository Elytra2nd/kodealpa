import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import type { GrimoireCategory } from '@/types/grimoire';

export default function GrimoireSidebar({
  categories, activeCategory, onSelectCategory,
}: {
  categories: GrimoireCategory[];
  activeCategory?: string;
  onSelectCategory: (slug?: string) => void;
}) {
  return (
    <div className="p-2 rounded-lg border border-stone-700 bg-stone-900/40">
      <Accordion type="single" collapsible defaultValue={activeCategory}>
        <AccordionItem value="all">
          <AccordionTrigger onClick={()=>onSelectCategory(undefined)}>📚 Semua Kategori</AccordionTrigger>
          <AccordionContent className="text-stone-300">Tampilkan semua pedoman tanpa filter.</AccordionContent>
        </AccordionItem>
        {categories.map((cat)=>(
          <AccordionItem key={cat.id} value={cat.slug}>
            <AccordionTrigger onClick={()=>onSelectCategory(cat.slug)}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.title}
            </AccordionTrigger>
            <AccordionContent className="text-stone-300">
              Pedoman terkait {cat.title}.
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
