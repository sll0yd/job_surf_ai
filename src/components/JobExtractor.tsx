'use client';

import React, { useState } from 'react';
import axios from 'axios';
import Input from './ui/Input';
import Button from './ui/Button';
import JobResult from './JobResult';
import { JobInfo, ExtractorResponse } from '@/types';

const JobExtractor: React.FC = () => {
  const [url, setUrl] = useState('');
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL is required');
      return false;
    }
    
    try {
      new URL(url);
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous results
    setError(null);
    setJobInfo(null);
    
    // Validate URL
    if (!validateUrl(url)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post<ExtractorResponse>('/api/extract-job', { url });
      
      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.data) {
        setJobInfo(response.data.data);
      } else {
        setError('No job information found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract job information');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Job Offer Extractor</h2>
        <p className="text-gray-600 mb-6">
          Paste a job offer URL from LinkedIn, Glassdoor, Indeed, or Welcome to the Jungle to extract information.
        </p>
        
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              type="url"
              placeholder="Paste job offer URL here"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={urlError || undefined}
              fullWidth
              aria-label="Job URL"
            />
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!url.trim()}
              className="whitespace-nowrap"
            >
              Extract Info
            </Button>
          </div>
        </form>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {jobInfo && <JobResult jobInfo={jobInfo} />}
      </div>
    </div>
  );
};

export default JobExtractor;