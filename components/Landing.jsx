'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CHAPTERS, bn } from '@/data/chapters';

const Sim3D = dynamic(() => import('@/components/Sim3D'), { ssr: false });

export default function Landing() {
  const router = useRouter();
  const heroParams = useRef({});
  const topicCount = CHAPTERS.reduce((s, c) => s + c.topics.length, 0);
  return (
    <div className="pk">
      <section className="hero">
        <div className="hero-canvas">
          <Sim3D simKey="hero" paramsRef={heroParams} fill
            onSelect={(id) => router.push(`/chapter/${id}`)} />
        </div>
        <div className="heroC">
          <span className="eyebrow">📗 শিখো × এনসিটিবি · নবম-দশম শ্রেণি</span>
          <h1>শিখো <span className="glow">ফিজিক্স ল্যাব</span></h1>
          <p className="sub">
            শিখবো, জিতবো! এনসিটিবি পদার্থবিজ্ঞান বইয়ের {bn(14)}টি অধ্যায়ের জন্য
            বাস্তব-দৃশ্যের ৩ডি সিমুলেশন। ঘুরতে থাকা রঙিন গ্রহগুলোই {bn(14)}টি
            অধ্যায় — ট্যাপ করেই ঢুকে পড়ো!
          </p>
          <Link href="/chapters">
            <button className="play">▶ শুরু করো</button>
          </Link>
          <div className="chips">
            <span className="chip">{bn(14)}টি অধ্যায়</span>
            <span className="chip">{bn(topicCount)}+ টপিক</span>
            <span className="chip">{bn(14)}টি ৩ডি সিম</span>
            <span className="chip">সম্পূর্ণ বাংলায়</span>
          </div>
        </div>
        <div className="hint">🪐 গ্রহে ট্যাপ = অধ্যায়ে প্রবেশ · ⚛️ পরমাণুতে ট্যাপ = বিস্ফোরণ · 🌀 টেনে ঘোরাও</div>
      </section>
    </div>
  );
}
