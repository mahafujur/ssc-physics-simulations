'use client';

import dynamic from 'next/dynamic';
import { getChapter } from '@/data/chapters';

const SimView = dynamic(() => import('@/components/SimView'), {
  ssr: false,
  loading: () => <div style={{ flex:1,display:'grid',placeItems:'center',color:'#8fc8a8' }}>⚛️ লোড হচ্ছে…</div>,
});

export default function SimClient({ id }) {
  return <SimView ch={getChapter(id)} />;
}
