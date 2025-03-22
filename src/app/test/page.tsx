// src/app/test/page.tsx
import TestBlockedSites from '@/components/TestBlockedSites';

export default function TestPage() {
  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Blocked Sites Testing</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Test the application's handling of sites that block automated access
        </p>
      </header>
      
      <TestBlockedSites />
      
      <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>This is a testing page for developers to validate the blocked site handling functionality</p>
      </footer>
    </div>
  );
}