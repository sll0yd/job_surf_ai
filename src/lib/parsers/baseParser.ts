import { JobData } from '../types';
import * as cheerio from 'cheerio';

// Helper function for text extraction that handles null values and trims
export function extractText($: cheerio.CheerioAPI, selector: string, defaultValue: string = ''): string {
  const element = $(selector);
  if (element.length === 0) return defaultValue;
  return element.text().trim();
}

// Define interfaces for JSON-LD structured data
interface JsonLdAddress {
  addressLocality?: string;
  addressRegion?: string;
  streetAddress?: string;
  postalCode?: string;
  addressCountry?: string;
}

interface JsonLdOrganization {
  name?: string;
  sameAs?: string;
  logo?: string;
}

interface JsonLdSalary {
  currency?: string;
  minValue?: number;
  maxValue?: number;
  unitText?: string;
  value?: number;
}

interface JsonLdJobPosting {
  '@type'?: string;
  '@context'?: string;
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization?: JsonLdOrganization;
  jobLocation?: { address?: JsonLdAddress } | string;
  baseSalary?: JsonLdSalary;
  estimatedSalary?: JsonLdSalary;
  skills?: string | string[];
  qualifications?: string | string[];
  responsibilities?: string | string[];
  applicantLocationRequirements?: string;
  workHours?: string;
  experienceRequirements?: string;
  industry?: string;
  [key: string]: unknown; // Allow for additional fields
}

interface JsonLdGraph {
  '@graph'?: JsonLdJobPosting[];
  [key: string]: unknown;
}

// Helper to extract JSON-LD structured data from page
export function extractJsonLd($: cheerio.CheerioAPI, type: string = 'JobPosting'): JsonLdJobPosting | null {
  const jsonLdElements = $('script[type="application/ld+json"]');
  
  if (jsonLdElements.length === 0) return null;
  
  // Check each JSON-LD block
  for (let i = 0; i < jsonLdElements.length; i++) {
    try {
      const jsonContent = $(jsonLdElements[i]).html();
      if (!jsonContent) continue;
      
      const data = JSON.parse(jsonContent) as JsonLdJobPosting | JsonLdGraph;
      
      // Handle both direct type and array of types
      if (
        (data['@type'] === type) || 
        (Array.isArray(data['@graph']) && data['@graph']?.some((item: JsonLdJobPosting) => item['@type'] === type))
      ) {
        // If it's in @graph, find the relevant item
        if (Array.isArray(data['@graph'])) {
          const foundItem = data['@graph'].find((item: JsonLdJobPosting) => item['@type'] === type);
          return foundItem || null;
        }
        return data as JsonLdJobPosting;
      }
    } catch (e) {
      console.error('Error parsing JSON-LD:', e);
    }
  }
  
  return null;
}

// Helper to convert an array-like object or comma-separated string to an array of strings
export function stringToArray(input: string | string[] | null | undefined): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(item => item.trim()).filter(Boolean);
  return input.split(/[,\n•]/).map(item => item.trim()).filter(Boolean);
}

// Helper to detect language from text content
export function detectLanguage(text: string): 'en' | 'fr' {
  // Count French-specific words
  const frenchWords = ['emploi', 'poste', 'entreprise', 'travail', 'société', 'salaire', 'expérience', 'compétences'];
  const frenchCount = frenchWords.reduce((count, word) => {
    return count + (text.toLowerCase().match(new RegExp(word, 'g')) || []).length;
  }, 0);
  
  return frenchCount > 3 ? 'fr' : 'en';
}

// Base parser result that includes a flag to request AI enrichment
export interface ParserResult extends Partial<JobData> {
  needsEnrichment?: boolean;
}