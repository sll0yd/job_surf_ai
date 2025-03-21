import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { extractJobInformation } from '@/lib/openai';
import { ExtractResponse } from '@/lib/types';

// Simple in-memory request tracking for rate limiting
const requestTracker = {
  lastRequestTime: 0,
  count: 0,
  reset: () => {
    requestTracker.count = 0;
    requestTracker.lastRequestTime = Date.now();
  }
};

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
    // Basic rate limiting to prevent excessive requests
    const now = Date.now();
    if (now - requestTracker.lastRequestTime < 10000) { // 10 seconds
      requestTracker.count++;
      if (requestTracker.count > 3) { // Max 3 requests in 10 seconds
        return NextResponse.json<ExtractResponse>(
          { 
            success: false, 
            error: 'Rate limit exceeded. Please try again in a few seconds.',
            data: {
              title: "Rate Limited",
              company: "Unknown",
              description: "Too many requests in a short time. Please try again later.",
              url: "N/A",
              language: "en",
              location: "Unknown"
            }
          },
          { status: 429 }
        );
      }
    } else {
      requestTracker.reset();
    }

    // Parse the request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json<ExtractResponse>(
        { 
          success: false, 
          error: 'URL is required',
          data: {
            title: "Error",
            company: "Unknown",
            description: "URL is required to extract job information.",
            url: "N/A",
            language: "en",
            location: "Unknown"
          }
        },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!isValidURL(url)) {
      return NextResponse.json<ExtractResponse>(
        { 
          success: false, 
          error: 'Invalid URL format',
          data: {
            title: "Invalid URL",
            company: "Unknown",
            description: "The provided URL is not valid.",
            url: url,
            language: "en",
            location: "Unknown"
          }
        },
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
        timeout: 30000, // Increased timeout
        maxRedirects: 5,
      });

      const htmlContent = response.data;
      
      // Log the HTML content length for debugging
      console.log(`HTML content retrieved - length: ${htmlContent.length} bytes`);
      
      // Extract job information using OpenAI
      try {
        const jobData = await extractJobInformation(htmlContent, url);
        
        // Add the original URL to the job data if not present
        if (!jobData.url) {
          jobData.url = url;
        }
        
        return NextResponse.json<ExtractResponse>(
          { success: true, data: jobData },
          { status: 200 }
        );
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        return NextResponse.json<ExtractResponse>(
          { 
            success: false, 
            error: `Error processing with OpenAI: ${openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error'}`,
            data: {
              title: "Error processing job",
              company: "Unknown",
              description: "There was an error processing this job listing. Please try again later or with a different URL.",
              url: url,
              language: "en",
              location: "Unknown Location"
            }
          },
          { status: 500 }
        );
      }
    } catch (error) {
      // Type guard to check if it's an Axios error
      const axiosError = error as AxiosError;
      let errorMessage = 'Unknown error occurred';
      
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const statusCode = axiosError.response.status;
        errorMessage = `Failed to fetch the webpage (Status: ${statusCode})`;
        
        if (statusCode === 403) {
          errorMessage = "Access forbidden. This website may be blocking web scraping attempts. Try a different URL or use a website that allows public access.";
        } else if (statusCode === 404) {
          errorMessage = "The requested page was not found. Please check the URL and try again.";
        } else if (statusCode === 429) {
          errorMessage = "Too many requests. The website is limiting access. Please try again later.";
        }
      } else if (axiosError.request) {
        // The request was made but no response was received
        errorMessage = "No response received from the website. It may be down or blocking access.";
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = axiosError.message || 'Unknown error occurred';
      }
      
      return NextResponse.json<ExtractResponse>(
        { 
          success: false, 
          error: errorMessage,
          data: {
            title: "Error fetching job listing",
            company: "Unknown",
            description: "There was an error fetching the job listing data: " + errorMessage,
            url: url,
            language: "en",
            location: "Unknown Location"
          }
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Error processing job extraction:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return NextResponse.json<ExtractResponse>(
      { 
        success: false, 
        error: errorMessage,
        data: {
          title: "Error",
          company: "Unknown",
          description: "An unexpected error occurred: " + errorMessage,
          url: "N/A",
          language: "en",
          location: "Unknown Location"
        }
      },
      { status: 500 }
    );
  }
}