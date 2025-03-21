'use client';

import { useState } from 'react';
import axios from 'axios';
import { JobData, ExtractResponse } from '@/lib/types';
import LoadingSpinner from './LoadingSpinner';
import JsonViewer from './JsonViewer';

const JobExtractor = () => {
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setJobData(null);
    
    if (inputType === 'url') {
      // Validate URL
      if (!url.trim()) {
        setError('Please enter a job offer URL');
        return;
      }
      
      try {
        setIsLoading(true);
        
        const response = await axios.post<ExtractResponse>('/api/extract-job', { url });
        
        if (response.data.success && response.data.data) {
          setJobData(response.data.data);
        } else {
          setError(response.data.error || 'Failed to extract job information');
        }
      } catch (err) {
        console.error('Error extracting job information:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Validate text
      if (!jobText.trim() || jobText.trim().length < 50) {
        setError('Please enter more text from the job offer (minimum 50 characters)');
        return;
      }
      
      try {
        setIsLoading(true);
        
        const response = await axios.post<ExtractResponse>('/api/extract-job-text', { text: jobText });
        
        if (response.data.success && response.data.data) {
          setJobData(response.data.data);
        } else {
          setError(response.data.error || 'Failed to extract job information');
        }
      } catch (err) {
        console.error('Error extracting job information from text:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="mb-4">
        <div className="flex space-x-4">
          <button 
            type="button"
            className={`px-4 py-2 rounded-md transition ${inputType === 'url' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            onClick={() => setInputType('url')}
          >
            Par URL
          </button>
          <button 
            type="button"
            className={`px-4 py-2 rounded-md transition ${inputType === 'text' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
            onClick={() => setInputType('text')}
          >
            Par texte
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {inputType === 'url' ? (
          <div>
            <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL de l&apos;offre d&apos;emploi
            </label>
            <input
              type="url"
              id="jobUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Collez l'URL d'une offre d'emploi (ex: https://example.com/jobs/software-engineer)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-white"
              disabled={isLoading}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="jobText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contenu de l&apos;offre d&apos;emploi
            </label>
            <textarea
              id="jobText"
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Copiez-collez le contenu de l'offre d'emploi ici..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-700 dark:text-white h-64"
              disabled={isLoading}
            />
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Extraire les informations
        </button>
      </form>
      
      {isLoading && <LoadingSpinner />}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-md">
          <p className="font-medium">Erreur</p>
          <p>{error}</p>
        </div>
      )}
      
      {jobData && <JsonViewer data={jobData} />}
      
      {jobData && (
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-gray-700">
            <h3 className="text-lg font-medium">Détails de l&apos;offre</h3>
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold">{jobData.title}</h2>
            <div className="flex flex-wrap gap-x-4 mt-2 text-gray-600 dark:text-gray-300">
              <p>{jobData.company}</p>
              {jobData.location && <p>• {jobData.location}</p>}
              {jobData.jobType && <p>• {jobData.jobType}</p>}
            </div>
            
            {jobData.salary && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200">Salaire</h4>
                <p>{jobData.salary}</p>
              </div>
            )}
            
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-200">Description</h4>
              <p className="whitespace-pre-line">{jobData.description}</p>
            </div>
            
            {jobData.requirements && jobData.requirements.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200">Exigences</h4>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {jobData.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {jobData.responsibilities && jobData.responsibilities.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200">Responsabilités</h4>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {jobData.responsibilities.map((resp, idx) => (
                    <li key={idx}>{resp}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {jobData.benefits && jobData.benefits.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-200">Avantages</h4>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {jobData.benefits.map((benefit, idx) => (
                    <li key={idx}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              {jobData.postedDate && <p>Date de publication: {jobData.postedDate}</p>}
              {jobData.applicationDeadline && <p>Date limite: {jobData.applicationDeadline}</p>}
              <p>Langue: {jobData.language === 'en' ? 'Anglais' : jobData.language === 'fr' ? 'Français' : jobData.language}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobExtractor;