import Link from 'next/link';
import { notFound } from 'next/navigation';
import TopBar from '@/components/TopBar';
import { CHAPTERS, getChapter, bn } from '@/data/chapters';
export function generateStaticParams() { return CHAPTERS.map((c) => ({ id: String(c.id) })); }
export default function ChapterPage({ params }) {
  const ch = getChapter(params.id); if (!ch) notFound();
  return (
    <main className="pk">
      <TopBar href="/chapters" backLabel="সব অধ্যায়" title={`অধ্যায় ${bn(ch.id)}`} />
      <section className="chero" style={{ '--h': ch.hue }}>
        <div className="ic">{ch.icon}</div><h2>{ch.title}</h2>
        <p>{ch.en} · {bn(ch.topics.length)}টি টপিক</p>
      </section>
      <Link href={`/sim/${ch.id}`} className="launch" style={{ '--h': ch.hue }}>
        <span className="cube">🧊</span>
        <div><h3>{ch.simTitle}</h3><span className="s">বাস্তব দৃশ্যে ৩ডি সিমুলেশন — আঙুলে ঘোরাও, জুম করো, খেলো!</span></div>
        <span className="arrow">▶</span>
      </Link>
      <div className="tlist">
        {ch.topics.map((t, i) => (
          <Link key={i} href={`/sim/${ch.id}?topic=${encodeURIComponent(t)}`} className="titem" style={{ '--h': ch.hue }}>
            <span className="tnum">{bn(i + 1)}</span><span>{t}</span><span className="tplay">৩ডি দেখো ▶</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
