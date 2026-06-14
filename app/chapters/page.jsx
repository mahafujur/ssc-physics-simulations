import Link from 'next/link';
import TopBar from '@/components/TopBar';
import { CHAPTERS, bn } from '@/data/chapters';
export const metadata = { title: 'অধ্যায় বাছাই করো — শিখো ফিজিক্স ল্যাব' };
export default function Chapters() {
  return (
    <main className="pk">
      <TopBar href="/" backLabel="হোম" title="শিখো ফিজিক্স ল্যাব" />
      <div className="shead">
        <h2>🎮 লেভেল বাছাই করো</h2>
        <p>এনসিটিবি বইয়ের {bn(14)}টি অধ্যায় — যেকোনো একটিতে ট্যাপ করে শুরু করো।</p>
      </div>
      <div className="grid">
        {CHAPTERS.map((c) => (
          <Link key={c.id} href={`/chapter/${c.id}`} className="lcard" style={{ '--h': c.hue }}>
            <div className="lnum"><span className="badge">{c.icon}</span>অধ্যায় {bn(c.id)}</div>
            <h3>{c.title}</h3>
            <span className="en">{c.en}</span>
            <div className="lmeta"><span>{bn(c.topics.length)}টি টপিক · ১টি ৩ডি সিম</span><span className="go">খেলো ▶</span></div>
          </Link>
        ))}
      </div>
      <p className="fnote">শিখো ফিজিক্স ল্যাব · শিখবো, জিতবো 💚 — এনসিটিবি পদার্থবিজ্ঞান, নবম-দশম শ্রেণি</p>
    </main>
  );
}
