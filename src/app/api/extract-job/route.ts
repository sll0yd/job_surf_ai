import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { extractJobInformation } from '@/lib/openai';
import { ExtractResponse } from '@/lib/types';
import { jobCache } from '@/lib/cache';
import { parseLinkedIn } from '@/lib/parsers/linkedin';
import { parseIndeed } from '@/lib/parsers/indeed';
import { parseMonster } from '@/lib/parsers/monster';
import { parseWTTJ } from '@/lib/parsers/wttj';
import { parseGlassdoor } from '@/lib/parsers/glassdoor';
import { getRandomizedHeaders, isBlockedSite, randomDelay, sanitizeJobUrl, handleBlockedSite } from '@/lib/proxy-utils';

// Simple in-memory request tracking for rate limiting
const requestTracker = {
  lastRequestTime: 0,
  count: 0,
  reset: () => {
    requestTracker.count = 0;
    requestTracker.lastRequestTime = Date.now();
  }
};

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

    // Validate and normalize URL
    let url: string;
    try {
      // Parse and sanitize URL to remove tracking parameters
      url = sanitizeJobUrl(rawUrl);
    } catch {
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
    
    // Check if the site is known to block scrapers
    const siteIsBlocked = isBlockedSite(url);
    
    // Get randomized headers based on the site
    const headers = getRandomizedHeaders(hostname);
    
    // Fetch the HTML content from the URL with enhanced headers
    try {
      console.log(`Fetching URL: ${url}`);
      
      // If the site is known to block scrapers, provide a specific message
      if (siteIsBlocked) {
        console.log(`Detected blocked job site (${hostname}) - suggesting text-based extraction`);
        
        // Extract basic information from the URL for blocked sites
        const blockedSiteData = handleBlockedSite(url);
        
        // Cache the basic info
        jobCache.set(url, blockedSiteData);
        
        return NextResponse.json<ExtractResponse>(
          { 
            success: false, 
            error: `${hostname} blocks automated access. Please copy the job content and use the 'Extract by Text' option instead.`,
            data: blockedSiteData
          },
          { status: 403 }
        );
      }
      
      // Add a small random delay to make requests look more human-like
      await randomDelay();
      
      // For other sites, proceed with normal scraping
      const response = await axios.get(url, {
        headers,
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
    } catch (fetchError) {
      // Type guard to check if it's an Axios error
      const axiosError = fetchError as AxiosError;
      console.error('Full error details:', fetchError);
      let errorMessage = 'Unknown error occurred';
      let statusCode = 500;
      
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        statusCode = axiosError.response.status;
        errorMessage = `Failed to fetch the webpage (Status: ${statusCode})`;
        
        if (statusCode === 403) {
          errorMessage = "Access forbidden. This website may be blocking web scraping attempts. Try using the 'Extract by Text' option instead.";
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
      
      // For any site returning 403, we should give specific guidance
      if (statusCode === 403 || siteIsBlocked) {
        errorMessage = "This website blocks automated access. Please copy the job description and use the 'Extract by Text' option instead.";
        
        // Add this site to our cache to speed up future responses
        jobCache.set(url, {
          title: "Access Blocked",
          company: hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1),
          description: "This website blocks automated access. To extract job information, please copy the job description text and use the 'Extract by Text' feature instead.",
          url: url,
          language: url.includes('.fr') ? 'fr' : 'en',
          location: "Unable to extract - Access blocked"
        });
        
        return NextResponse.json<ExtractResponse>(
          { 
            success: false, 
            error: errorMessage,
            data: {
              title: "Access Blocked",
              company: hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1),
              description: "This website blocks automated access. To extract job information, please copy the job description text and use the 'Extract by Text' feature instead.",
              url: url,
              language: url.includes('.fr') ? 'fr' : 'en',
              location: "Unable to extract - Access blocked"
            }
          },
          { status: 403 }
        );
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
    return parseLinkedIn;
  } else if (site.includes('indeed.com') || site.includes('indeed.fr')) {
    return parseIndeed;
  } else if (site.includes('monster.com') || site.includes('monster.fr')) {
    return parseMonster;
  } else if (site.includes('welcometothejungle.com')) {
    return parseWTTJ;
  } else if (site.includes('glassdoor.com') || site.includes('glassdoor.fr')) {
    return parseGlassdoor;
  }
  
  // Return null if no specific parser is available
  return null;
}