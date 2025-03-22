import * as cheerio from 'cheerio';
import { ParserResult, extractText, extractJsonLd, detectLanguage } from './baseParser';

export function parseLinkedIn(html: string, url: string): ParserResult {
  const $ = cheerio.load(html);
  
  // Try to get structured data first
  const jsonLd = extractJsonLd($);
  
  if (jsonLd) {
    // Handle jobLocation properly based on its type
    let location: string | undefined;
    if (typeof jsonLd.jobLocation === 'string') {
      location = jsonLd.jobLocation;
    } else if (jsonLd.jobLocation && typeof jsonLd.jobLocation === 'object') {
      location = jsonLd.jobLocation.address?.addressLocality;
    }

    return {
      title: jsonLd.title,
      company: jsonLd.hiringOrganization?.name,
      location: location,
      description: jsonLd.description,
      datePosted: jsonLd.datePosted,
      validThrough: jsonLd.validThrough,
      employmentType: jsonLd.employmentType,
      salary: jsonLd.baseSalary ? 
        `${jsonLd.baseSalary.minValue || ''} - ${jsonLd.baseSalary.maxValue || ''} ${jsonLd.baseSalary.currency || ''}` : 
        undefined,
      url: url,
      language: detectLanguage(jsonLd.description || ''),
      needsEnrichment: true, // Request AI to extract requirements, responsibilities, and benefits
    };
  }
  
  // Fallback to HTML parsing
  const title = extractText($, '.top-card-layout__title, .job-details-jobs-unified-top-card__job-title');
  const company = extractText($, '.topcard__org-name-link, .job-details-jobs-unified-top-card__company-name');
  const location = extractText($, '.topcard__flavor--bullet, .job-details-jobs-unified-top-card__bullet');
  
  // Description varies based on LinkedIn's layout
  let description = '';
  const descriptionSection = $('.description__text, .show-more-less-html__markup');
  if (descriptionSection.length > 0) {
    description = descriptionSection.text().trim();
  }
  
  // Posting date
  const postedDate = extractText($, '.posted-time-ago__text, .job-details-jobs-unified-top-card__posted-date');
  
  // Try to extract salary information
  const salaryText = $('.compensation__salary').text().trim() || 
                    $('.job-details-jobs-unified-top-card__job-insight').first().text().trim();
  
  // Determine language based on page content
  const language = detectLanguage(description || title);
  
  // Return the parsed data
  return {
    title,
    company,
    location,
    description,
    postedDate,
    salary: salaryText || undefined,
    url,
    language,
    needsEnrichment: true, // Let AI help with structured extraction
  };
}