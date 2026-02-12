'use client';
import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    window.location.replace('/en');
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10 text-center">
      <p>
        Redirecting to docs home...
        <a className="ml-2 underline" href="/en">
          Continue
        </a>
      </p>
    </main>
  );
}
