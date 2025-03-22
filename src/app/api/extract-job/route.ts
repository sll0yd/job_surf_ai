import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { extractJobInformation } from '@/lib/openai';
import { ExtractResponse } from '@/lib/types';
import { jobCache } from '@/lib/cache';

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

// Helper to normalize URLs for consistent caching
function normalizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.toString();
  } catch {
    return url; // Return original if parsing fails
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
    const rawUrl = body.url;

    if (!rawUrl) {
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

    // Normalize and validate URL
    let url: string;
    try {
      // Parse it to ensure it's valid and get a normalized version
      const parsedUrl = new URL(rawUrl);
      url = parsedUrl.toString();
    } catch (error) {
      return NextResponse.json<ExtractResponse>(
        { 
          success: false, 
          error: 'Invalid URL format',
          data: {
            title: "Invalid URL",
            company: "Unknown",
            description: "The provided URL is not valid.",
            url: rawUrl,
            language: "en",
            location: "Unknown"
          }
        },
        { status: 400 }
      );
    }
    
    // Check cache before making a new request
    const cachedData = jobCache.get(url);
    if (cachedData) {
      console.log(`Cache hit for URL: ${url}`);
      return NextResponse.json<ExtractResponse>(
        { success: true, data: cachedData },
        { status: 200 }
      );
    }

    // Determine which job site parser to use
    const hostname = new URL(url).hostname;
    const specificParser = getParserForSite(hostname);
    
    // Fetch the HTML content from the URL with enhanced headers
    try {
      console.log(`Fetching URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
        },
        timeout: 30000, // Increased timeout
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept all 2xx/3xx/4xx status codes
        },
      });

      // Handle non-200 responses
      if (response.status !== 200) {
        return NextResponse.json<ExtractResponse>(
          { 
            success: false, 
            error: `Website returned status code ${response.status}`,
            data: {
              title: "Error fetching job listing",
              company: "Unknown",
              description: `The website returned status code ${response.status}. This might mean the job listing has been removed or the website is blocking our access.`,
              url: url,
              language: "en",
              location: "Unknown Location"
            }
          },
          { status: response.status }
        );
      }

      const htmlContent = response.data;
      
      // Log the HTML content length for debugging
      console.log(`HTML content retrieved - length: ${htmlContent.length} bytes`);
      
      // Extract job information using site-specific parser or OpenAI fallback
      try {
        let jobData;
        
        if (specificParser) {
          console.log(`Using specific parser for ${hostname}`);
          jobData = specificParser(htmlContent, url);
          
          // If parser returned partial data, fill in the gaps with OpenAI
          if (jobData.needsEnrichment) {
            delete jobData.needsEnrichment;
            const aiData = await extractJobInformation(htmlContent, url);
            jobData = { ...aiData, ...jobData }; // Parser data takes precedence
          }
        } else {
          console.log(`No specific parser found for ${hostname}, using OpenAI`);
          jobData = await extractJobInformation(htmlContent, url);
        }
        
        // Add the original URL to the job data if not present
        if (!jobData.url) {
          jobData.url = url;
        }
        
        // Cache the result
        jobCache.set(url, jobData);
        
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
      console.error('Full error details:', error);
      let errorMessage = 'Unknown error occurred';
      let statusCode = 500;
      
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        statusCode = axiosError.response.status;
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
        { status: statusCode }
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

// Helper function to determine which parser to use based on the site
function getParserForSite(hostname: string) {
  // Convert hostname to lowercase for case-insensitive matching
  const site = hostname.toLowerCase();
  
  if (site.includes('linkedin.com')) {
    return require('@/lib/parsers/linkedin').parseLinkedIn;
  } else if (site.includes('indeed.com') || site.includes('indeed.fr')) {
    return require('@/lib/parsers/indeed').parseIndeed;
  } else if (site.includes('monster.com') || site.includes('monster.fr')) {
    return require('@/lib/parsers/monster').parseMonster;
  } else if (site.includes('welcometothejungle.com')) {
    return require('@/lib/parsers/wttj').parseWTTJ;
  } else if (site.includes('glassdoor.com') || site.includes('glassdoor.fr')) {
    return require('@/lib/parsers/glassdoor').parseGlassdoor;
  }
  
  // Return null if no specific parser is available
  return null;
}