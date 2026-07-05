import Link from 'next/link';

export default function AppBar({ right = null }) {
  return (
    <header className="appbar">
      <div className="appbar-inner">
        <Link href="/" className="brand">
          <span className="brand-dot">K</span>
          <span>KasiCart</span>
        </Link>
        {right}
      </div>
    </header>
  );
}
