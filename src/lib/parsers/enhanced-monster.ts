// src/lib/parsers/enhanced-monster.ts

/**
 * Enhanced parser for Monster that attempts to extract information directly from the URL
 * since Monster sites block regular scraping
 */
import { ParserResult } from './baseParser';

export function extractInfoFromMonsterUrl(url: string): Partial<ParserResult> {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/');
    
    // Determine language from domain
    const language = parsedUrl.hostname.endsWith('.fr') ? 'fr' : 'en';
    
    // Try to extract job title from URL path
    let title = "Monster Job Listing";
    let location = "Unknown Location";
    
    // Clean path parts to extract job title elements
    // Monster URLs often have the job title in the path
    // e.g. /offres-demploi/spécialiste-seo-h-f-bayonne-64--1a98731e-8cc5-4d96-9eea-415dba5faa68
    
    // First, find the part before the UUID (if present)
    const jobInfoPart = pathParts.find(part => 
      part.includes('emploi') || 
      part.includes('job') || 
      part.includes('offres')
    );
    
    if (jobInfoPart) {
      // Extract job title by removing common parts and decoding URL encoding
      const titleParts = decodeURIComponent(jobInfoPart)
        .replace(/offres-d[']?emploi\/?/i, '')
        .replace(/jobs?\/?/i, '')
        .replace(/-+/g, ' ')
        .trim();
      
      if (titleParts) {
        title = titleParts.charAt(0).toUpperCase() + titleParts.slice(1);
        
        // Try to extract location - often after the job title with a hyphen
        const locationMatch = title.match(/\s+([a-zA-Z\s]+\d{2,5})$/);
        if (locationMatch) {
          location = locationMatch[1].trim();
          title = title.replace(locationMatch[0], '').trim();
        }
      }
    }
    
    // Extract job ID if present
    let jobId = "Unknown";
    const jobIdMatch = url.match(/([a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12})/);
    if (jobIdMatch) {
      jobId = jobIdMatch[0];
    }
    
    // Return extracted information
    return {
      title,
      company: "Company on Monster",
      location,
      description: `This job was found on Monster but couldn't be accessed directly due to scraping protections. The job ID is: ${jobId}. Please copy the job details manually from the site and use the 'Extract by Text' option instead.`,
      url: url,
      language,
      jobId,
      needsEnrichment: true // Always needs enrichment as we can only extract limited info
    };
  } catch (error) {
    console.error("Error parsing Monster URL:", error);
    return {
      title: "Monster Job Listing",
      company: "Company on Monster",
      description: "Error extracting information from Monster URL. Please copy the job details manually and use the 'Extract by Text' option.",
      url: url,
      language: url.includes('.fr') ? 'fr' : 'en',
      needsEnrichment: true
    };
  }
}