import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Hemisphere</h1>
      <p>Next.js shell scaffolded for the learning app.</p>
      <p>
        <Link href="/dashboard">Open dashboard shell</Link>
      </p>
    </main>
  );
}
