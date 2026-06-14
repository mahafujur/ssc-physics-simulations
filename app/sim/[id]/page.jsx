import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { CHAPTERS, getChapter } from '@/data/chapters';

export function generateStaticParams() { return CHAPTERS.map((c) => ({ id: String(c.id) })); }

const SimClient = dynamic(() => import('./SimClient'), {
  ssr: false,
  loading: () => <div style={{ flex:1,display:'grid',placeItems:'center',minHeight:'60dvh',color:'#8fc8a8' }}>⚛️ ৩ডি ল্যাব লোড হচ্ছে…</div>,
});

function TopicTitle({ fallback }) {
  return fallback;
}

export default function SimPage({ params, searchParams }) {
  const ch = getChapter(params.id); if (!ch) notFound();
  const topic = searchParams?.topic;
  return (
    <main className="pk" style={{ height: '100dvh', flexDirection: 'column' }}>
      <header className="topbar">
        <Link href={`/chapter/${ch.id}`} className="back">← টপিক তালিকা</Link>
        <div className="brand"><span className="dot" /><span className="t">{ch.icon} {topic || ch.title}</span></div>
      </header>
      <SimClient id={ch.id} />
    </main>
  );
}
