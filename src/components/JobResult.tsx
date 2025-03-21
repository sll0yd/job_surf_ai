'use client';

import React, { useState } from 'react';
import { JobInfo } from '@/types';
import Button from './ui/Button';

interface JobResultProps {
  jobInfo: JobInfo;
}

const JobResult: React.FC<JobResultProps> = ({ jobInfo }) => {
  const [format, setFormat] = useState<'pretty' | 'json'>('pretty');
  
  // Function to copy JSON to clipboard
  const copyToClipboard = () => {
    const jsonString = JSON.stringify(jobInfo, null, 2);
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        alert('JSON copied to clipboard!');
      })
      .catch(() => {
        alert('Failed to copy to clipboard');
      });
  };

  // Pretty format display
  const PrettyFormat = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-lg font-semibold text-blue-800">{jobInfo.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-medium">{jobInfo.company}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-600">{jobInfo.location}</span>
          {jobInfo.employmentType && (
            <>
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">{jobInfo.employmentType}</span>
            </>
          )}
        </div>
        {jobInfo.salary && (
          <div className="mt-2">
            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded">
              {jobInfo.salary}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Description</h4>
        <p className="text-gray-700 whitespace-pre-line">{jobInfo.description}</p>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Requirements</h4>
        <ul className="list-disc list-inside space-y-1">
          {jobInfo.requirements.map((req, index) => (
            <li key={index} className="text-gray-700">{req}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Responsibilities</h4>
        <ul className="list-disc list-inside space-y-1">
          {jobInfo.responsibilities.map((resp, index) => (
            <li key={index} className="text-gray-700">{resp}</li>
          ))}
        </ul>
      </div>

      {jobInfo.benefits && jobInfo.benefits.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Benefits</h4>
          <ul className="list-disc list-inside space-y-1">
            {jobInfo.benefits.map((benefit, index) => (
              <li key={index} className="text-gray-700">{benefit}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {jobInfo.experienceLevel && (
          <div>
            <span className="font-medium">Experience Level:</span> {jobInfo.experienceLevel}
          </div>
        )}
        {jobInfo.postedDate && (
          <div>
            <span className="font-medium">Posted On:</span> {jobInfo.postedDate}
          </div>
        )}
        {jobInfo.deadline && (
          <div>
            <span className="font-medium">Apply Before:</span> {jobInfo.deadline}
          </div>
        )}
        {jobInfo.contactInfo && (
          <div>
            <span className="font-medium">Contact:</span> {jobInfo.contactInfo}
          </div>
        )}
        <div>
          <span className="font-medium">Platform:</span> {jobInfo.platform}
        </div>
        <div>
          <span className="font-medium">Language:</span> {jobInfo.language === 'en' ? 'English' : 'French'}
        </div>
      </div>
      
      <div>
        <span className="font-medium">Source URL:</span>{' '}
        <a href={jobInfo.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
          {jobInfo.url}
        </a>
      </div>
    </div>
  );

  // JSON format display
  const JsonFormat = () => (
    <div className="relative">
      <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
        <code>{JSON.stringify(jobInfo, null, 2)}</code>
      </pre>
      <button 
        onClick={copyToClipboard}
        className="absolute top-2 right-2 bg-white text-gray-800 hover:bg-gray-200 px-2 py-1 rounded text-sm"
        aria-label="Copy to clipboard"
      >
        Copy
      </button>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Extracted Job Information</h3>
        <div className="flex space-x-2">
          <Button 
            variant={format === 'pretty' ? 'primary' : 'outline'}
            onClick={() => setFormat('pretty')}
          >
            Pretty
          </Button>
          <Button 
            variant={format === 'json' ? 'primary' : 'outline'}
            onClick={() => setFormat('json')}
          >
            JSON
          </Button>
        </div>
      </div>
      <div className="p-4">
        {format === 'pretty' ? <PrettyFormat /> : <JsonFormat />}
      </div>
    </div>
  );
};

export default JobResult;