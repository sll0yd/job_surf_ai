import { OpenAI } from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { JobInfo } from '@/types';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to fetch HTML content from a URL
export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw new Error('Failed to fetch content from the provided URL');
  }
}

// Function to extract text content from HTML
export function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $('script, style').remove();
  
  // Get the text content of the job description section
  // This is a generic approach; different job sites will have different structures
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  
  // Return a reasonable chunk of text for analysis
  return bodyText.substring(0, 15000);
}

// Identify the platform based on the URL
export function identifyPlatform(url: string): string {
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('glassdoor.com')) return 'Glassdoor';
  if (url.includes('indeed.com')) return 'Indeed';
  if (url.includes('welcometothejungle.com')) return 'Welcome to the Jungle';
  return 'Unknown';
}

// Determine language based on text content
export function detectLanguage(text: string): 'en' | 'fr' {
  // Simple language detection based on common French words
  const frenchWords = ['emploi', 'société', 'entreprise', 'poste', 'compétences', 'expérience', 'salaire', 'avantages'];
  const frenchWordCount = frenchWords.filter(word => text.toLowerCase().includes(word)).length;
  
  return frenchWordCount >= 3 ? 'fr' : 'en';
}

// Main function to extract job information using OpenAI
export async function extractJobInfo(url: string): Promise<JobInfo> {
  try {
    // Fetch the job posting content
    const htmlContent = await fetchUrlContent(url);
    const textContent = extractTextFromHtml(htmlContent);
    
    // Identify platform and language
    const platform = identifyPlatform(url);
    const language = detectLanguage(textContent);
    
    // Create system message based on detected language
    let systemMessage = '';
    if (language === 'en') {
      systemMessage = `You are an AI assistant specializing in extracting structured job information from job postings. 
      Extract all relevant details from the provided job posting text and format the response as a clean JSON object.`;
    } else {
      systemMessage = `Vous êtes un assistant IA spécialisé dans l'extraction d'informations structurées à partir d'offres d'emploi. 
      Extrayez tous les détails pertinents du texte de l'offre d'emploi fourni et formatez la réponse sous forme d'un objet JSON propre.`;
    }
    
    // Create prompt based on detected language
    let userPrompt = '';
    if (language === 'en') {
      userPrompt = `Extract the following information from this job posting. If information is not available, use null:
      - Job title
      - Company name
      - Location
      - Job description summary
      - List of requirements/qualifications
      - List of responsibilities
      - Benefits (if available)
      - Salary information (if available)
      - Employment type (full-time, part-time, contract, etc.)
      - Experience level required
      - Contact information (if available)
      - Posted date (if available)
      - Application deadline (if available)
      
      Format the response as a JSON object with these keys: title, company, location, description, requirements (array), 
      responsibilities (array), benefits (array), salary, employmentType, experienceLevel, contactInfo, postedDate, deadline
      
      Job posting text:
      ${textContent}`;
    } else {
      userPrompt = `Extrayez les informations suivantes de cette offre d'emploi. Si l'information n'est pas disponible, utilisez null:
      - Titre du poste
      - Nom de l'entreprise
      - Lieu
      - Résumé de la description du poste
      - Liste des exigences/qualifications
      - Liste des responsabilités
      - Avantages (si disponibles)
      - Informations sur le salaire (si disponibles)
      - Type d'emploi (temps plein, temps partiel, contrat, etc.)
      - Niveau d'expérience requis
      - Coordonnées (si disponibles)
      - Date de publication (si disponible)
      - Date limite de candidature (si disponible)
      
      Formatez la réponse sous forme d'objet JSON avec ces clés: title, company, location, description, requirements (tableau), 
      responsibilities (tableau), benefits (tableau), salary, employmentType, experienceLevel, contactInfo, postedDate, deadline
      
      Texte de l'offre d'emploi:
      ${textContent}`;
    }

    // Make API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for better extraction
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const responseText = completion.choices[0].message.content || '{}';
    const parsedData: Partial<JobInfo> = JSON.parse(responseText);
    
    // Add platform, language and URL to the response
    return {
      ...parsedData,
      platform,
      language,
      url,
    } as JobInfo;
    
  } catch (error) {
    console.error('Error extracting job info:', error);
    throw new Error('Failed to extract job information');
  }
}