import Link from 'next/link';

export default function TopBar({ href, backLabel, title }) {
  return (
    <header className="topbar">
      <Link href={href} className="back">← {backLabel}</Link>
      <div className="brand"><span className="dot" /><span className="t">{title}</span></div>
    </header>
  );
}
