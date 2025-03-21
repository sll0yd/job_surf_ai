import JobExtractor from '@/components/JobExtractor';

export default function Home() {
  return (
    <div className="space-y-8">
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">JobSurf AI</h1>
        <p className="text-gray-600">
          Easily extract structured information from job listings across multiple platforms with AI.
          Works with LinkedIn, Welcome to the Jungle, Glassdoor, Indeed, and more.
        </p>
      </header>
      
      <JobExtractor />
      
      <footer className="text-center text-gray-500 text-sm pt-8 border-t border-gray-200 mt-16">
        <p>JobSurf AI - Extract job information using OpenAI</p>
        <p className="mt-1">Supports both English and French job listings</p>
      </footer>
    </div>
  );
}