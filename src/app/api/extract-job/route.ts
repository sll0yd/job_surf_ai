import { NextRequest, NextResponse } from 'next/server';
import { extractJobInfo } from '@/lib/openai';
import { ExtractorRequest, ExtractorResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: ExtractorRequest = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || !isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL provided', data: null } as ExtractorResponse,
        { status: 400 }
      );
    }

    // Extract job information
    const jobInfo = await extractJobInfo(url);

    // Return successful response
    return NextResponse.json(
      { data: jobInfo } as ExtractorResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in extract-job API:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        data: null 
      } as ExtractorResponse,
      { status: 500 }
    );
  }
}

// Helper function to validate URLs
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    
    // Check if it's from a job posting platform
    const validDomains = [
      'linkedin.com',
      'glassdoor.com',
      'indeed.com',
      'welcometothejungle.com',
      'monster.com',
      'ziprecruiter.com',
      'pole-emploi.fr',
      'apec.fr'
    ];
    
    return validDomains.some(domain => url.includes(domain));
  } catch {
    return false;
  }
}