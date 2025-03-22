// src/lib/proxy-utils.ts

/**
 * This module provides utilities for handling proxy rotation and anti-scraping circumvention.
 * In a production environment, you might want to use a paid proxy service.
 * For a personal project, this provides simple user-agent rotation and request delay.
 */

// Collection of common user agents for rotation
const userAgents = [
  // Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  // Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:94.0) Gecko/20100101 Firefox/94.0',
  // Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
  // Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36 Edg/96.0.1054.43',
  // Mobile browsers
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36'
];

// Common referrer URLs to make requests look more legitimate
const referrers = [
  'https://www.google.com/',
  'https://www.google.fr/',
  'https://www.bing.com/',
  'https://www.bing.fr/',
  'https://duckduckgo.com/',
  'https://www.linkedin.com/',
  'https://www.jobsearch.com/',
  'https://www.indeed.com/'
];

// List of known sites that block scraping
export const blockedSites = [
  'monster.fr',
  'monster.com',
  'glassdoor.com',
  'glassdoor.fr'
];

/**
 * Get request headers with randomized user-agent and referrer
 */
export function getRandomizedHeaders(hostname: string) {
  // Get random user agent and referrer
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  const referrer = referrers[Math.floor(Math.random() * referrers.length)];
  
  // Custom headers based on the site
  let siteSpecificHeaders = {};
  
  if (hostname.includes('linkedin')) {
    siteSpecificHeaders = {
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      'sec-ch-ua': '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    };
  } else if (hostname.includes('indeed')) {
    siteSpecificHeaders = {
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      'sec-ch-ua-mobile': '?0'
    };
  } else if (hostname.includes('glassdoor')) {
    siteSpecificHeaders = {
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest'
    };
  }
  
  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Referer': referrer,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Pragma': 'no-cache',
    'DNT': '1',
    ...siteSpecificHeaders
  };
}

/**
 * Check if a site is known to block scraping
 */
export function isBlockedSite(url: string): boolean {
  return blockedSites.some(site => url.includes(site));
}

/**
 * Generate a random delay between requests to avoid rate limiting
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 */
export function randomDelay(min = 1000, max = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Parse and sanitize a URL for various job sites
 * Some sites add tracking parameters that can change frequently
 */
export function sanitizeJobUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    
    // Remove common tracking parameters
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 
      'fbclid', 'gclid', 'ref', 'source', 'sid', 
      'jvo', 'hidesmr', 'promoted'
    ];
    
    paramsToRemove.forEach(param => {
      parsedUrl.searchParams.delete(param);
    });
    
    // For LinkedIn, we might need to keep just the core parts
    if (parsedUrl.hostname.includes('linkedin.com')) {
      // Keep only the main part of the path for LinkedIn job URLs
      const pathParts = parsedUrl.pathname.split('/');
      if (pathParts.includes('jobs') && pathParts.includes('view')) {
        // Try to extract just the job ID
        const jobIdIndex = pathParts.findIndex(part => /^\d+$/.test(part));
        if (jobIdIndex !== -1) {
          return `https://www.linkedin.com/jobs/view/${pathParts[jobIdIndex]}`;
        }
      }
    }
    
    return parsedUrl.toString();
  } catch (error) {
    console.error('Error sanitizing URL:', error);
    return url; // Return original if parsing fails
  }
}