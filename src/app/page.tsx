import JobExtractor from "@/components/JobExtractor";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Job Offer Extractor</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Paste any job offer URL to extract structured information
        </p>
      </header>
      
      <JobExtractor />
      
      <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Built with Next.js 15.2.3, TypeScript, and OpenAI</p>
      </footer>
    </div>
  );
}