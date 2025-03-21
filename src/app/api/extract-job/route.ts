import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { extractJobInformation } from '@/lib/openai';
import { ExtractResponse } from '@/lib/types';

// Function to validate URL format
function isValidURL(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json<ExtractResponse>(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!isValidURL(url)) {
      return NextResponse.json<ExtractResponse>(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the HTML content from the URL with enhanced headers
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          'TE': 'Trailers',
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      const htmlContent = response.data;
      
      // Extract job information using OpenAI
      const jobData = await extractJobInformation(htmlContent, url);
      
      // Add the original URL to the job data
      jobData.url = url;
      
      return NextResponse.json<ExtractResponse>(
        { success: true, data: jobData },
        { status: 200 }
      );
    } catch (error) {
      // Type guard pour vérifier si c'est une erreur Axios
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const statusCode = axiosError.response.status;
        let errorMessage = `Failed to fetch the webpage (Status: ${statusCode})`;
        
        if (statusCode === 403) {
          errorMessage = "Access forbidden. This website may be blocking web scraping attempts. Try a different URL or use a website that allows public access.";
        } else if (statusCode === 404) {
          errorMessage = "The requested page was not found. Please check the URL and try again.";
        } else if (statusCode === 429) {
          errorMessage = "Too many requests. The website is limiting access. Please try again later.";
        }
        
        return NextResponse.json<ExtractResponse>(
          { success: false, error: errorMessage },
          { status: 500 }
        );
      } else if (axiosError.request) {
        // The request was made but no response was received
        return NextResponse.json<ExtractResponse>(
          { success: false, error: "No response received from the website. It may be down or blocking access." },
          { status: 500 }
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        const errorMessage = axiosError.message || 'Unknown error occurred';
        return NextResponse.json<ExtractResponse>(
          { success: false, error: `Error with the request: ${errorMessage}` },
          { status: 500 }
        );
      }
    }
  } catch (err) {
    console.error('Error processing job extraction:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return NextResponse.json<ExtractResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}