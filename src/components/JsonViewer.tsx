'use client';

import { useState } from 'react';
import { JobData } from '../lib/types';
import React from 'react';

interface JsonViewerProps {
  data: JobData;
}

const JsonViewer = ({ data }: JsonViewerProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format JSON with syntax highlighting using CSS classes
  const formatJson = (json: Record<string, unknown>): React.ReactElement => {
    const jsonString = JSON.stringify(json, null, 2);
    
    // Replace specific patterns with span elements for styling
    const highlighted = jsonString
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>')
      .replace(/"([^"]+)"(?!:)/g, '<span class="json-string">"$1"</span>')
      .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
      .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="json-number">$1</span>');
    
    return (
      <pre 
        className="text-sm overflow-auto"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  };

  return (
    <div className="mt-6 bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800">
        <h3 className="text-white font-medium">Job Information</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md transition"
          >
            Download
          </button>
        </div>
      </div>
      <div className="p-4 max-h-96 overflow-auto bg-gray-950 text-white">
        {formatJson(data)}
      </div>
    </div>
  );
};

export default JsonViewer;

