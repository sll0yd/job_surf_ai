// src/components/TestBlockedSites.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { blockedSites, handleBlockedSite } from '@/lib/proxy-utils';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * This is a testing component for validating our solution for blocked sites
 * It demonstrates the direct extraction of information from URLs without making HTTP requests
 */
const TestBlockedSites = () => {
  const [url, setUrl] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [method, setMethod] = useState<'direct' | 'api'>('direct');

  // Check if the entered URL matches any of the known blocked sites
  const isBlockedSite = (url: string): boolean => {
    if (!url) return false;
    return blockedSites.some(site => url.includes(site));
  };

  // Handle the test submission
  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setError(null);
    
    if (!url.trim()) {
      setError('Please enter a URL to test');
      return;
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      setError('Invalid URL format');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (method === 'direct') {
        // Direct method - use our utility function to extract info from URL
        const blockSiteData = handleBlockedSite(url);
        setResult({
          method: 'Direct URL Analysis',
          data: blockSiteData,
          message: 'Information extracted from URL without making HTTP request'
        });
      } else {
        // API method - test our extract-job endpoint
        const response = await axios.post('/api/extract-job', { url });
        setResult({
          method: 'API Request',
          success: response.data.success,
          data: response.data.data,
          error: response.data.error,
          status: response.status
        });
      }
    } catch (err: any) {
      console.error('Error during test:', err);
      setError(err.message || 'An error occurred during testing');
      if (err.response) {
        setResult({
          method: 'API Request (Error)',
          status: err.response.status,
          data: err.response.data,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Blocked Sites Testing Tool</h1>
      <p className="mb-4 text-gray-600 dark:text-gray-300">
        Test how the application handles URLs from sites that block scraping
      </p>
      
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
        <h2 className="font-semibold text-blue-800 dark:text-blue-300">Known blocked sites:</h2>
        <ul className="list-disc pl-5 mt-2">
          {blockedSites.map(site => (
            <li key={site} className="text-blue-700 dark:text-blue-400">{site}</li>
          ))}
        </ul>
      </div>
      
      <form onSubmit={handleTest} className="space-y-4">
        <div>
          <label htmlFor="testUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Job URL to test
          </label>
          <input
            type="url"
            id="testUrl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.monster.fr/emploi/..."
            className={`w-full px-4 py-2 border ${isBlockedSite(url) ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm dark:bg-slate-700 dark:text-white`}
          />
          {isBlockedSite(url) && (
            <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ This URL is from a known blocked site ({blockedSites.find(site => url.includes(site))})
            </p>
          )}
        </div>
        
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="method"
              checked={method === 'direct'}
              onChange={() => setMethod('direct')}
              className="h-4 w-4 text-primary-600"
            />
            <span className="ml-2">Direct URL Analysis</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="method"
              checked={method === 'api'}
              onChange={() => setMethod('api')}
              className="h-4 w-4 text-primary-600"
            />
            <span className="ml-2">API Request Test</span>
          </label>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50"
        >
          Test URL
        </button>
      </form>
      
      {isLoading && <LoadingSpinner />}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-md">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md overflow-x-auto">
            <p className="mb-2"><strong>Method:</strong> {result.method}</p>
            {result.status && <p className="mb-2"><strong>Status:</strong> {result.status}</p>}
            {result.message && <p className="mb-2 text-green-600 dark:text-green-400">{result.message}</p>}
            {result.error && <p className="mb-2 text-red-600 dark:text-red-400"><strong>Error:</strong> {result.error}</p>}
            
            {result.data && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Extracted Data:</h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto whitespace-pre-wrap text-sm">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestBlockedSites;