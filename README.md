# JobSurf AI

JobSurf AI is a modern Next.js application that extracts structured information from job listings using AI. It supports both URL-based extraction and direct text input, making it versatile for job seekers and recruiters.

![JobSurf AI Logo](public/globe.svg)

## Features

- **Multi-source extraction**: Extract job details from various job platforms (LinkedIn, Glassdoor, Indeed, Welcome to the Jungle, etc.)
- **Dual input methods**: Process jobs via URL or direct text pasting
- **Multilingual support**: Automatically detects and processes both English and French job listings
- **Structured output**: Provides normalized JSON data for consistent information retrieval
- **Human-readable view**: Clean, well-formatted presentation of job details
- **Export options**: Copy to clipboard or download as JSON file
- **Responsive design**: Works seamlessly on desktop and mobile devices
- **Dark mode support**: Adapts to user's system preferences

## Tech Stack

- **Next.js 15.2.3**: Cutting-edge React framework with App Router
- **TypeScript**: Type-safe development experience
- **Tailwind CSS 4**: Modern utility-first CSS framework
- **OpenAI API**: Leverages GPT models for text extraction and analysis
- **Axios**: HTTP client for web scraping
- **Cheerio**: HTML parsing and preprocessing
- **React**: Latest version (19.0) for reactive UI components

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/job_surf_ai.git
cd job_surf_ai
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Development

Run the development server with Turbopack:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Building for Production

Build the application for production:

```bash
npm run build
# or
yarn build
```

Start the production server:

```bash
npm run start
# or
yarn start
```

## Usage

1. Choose between URL or text input mode using the toggle buttons
2. For URL mode:
   - Enter a job listing URL from any major job platform
   - Click "Extraire les informations" to process
3. For text mode:
   - Copy and paste job content directly into the text area
   - Click "Extraire les informations" to process
4. View the extracted information in the formatted display below
5. Use the JSON viewer section to copy or download the structured data

## API Endpoints

### POST /api/extract-job

Extracts job information from a URL.

**Request:**

```json
{
  "url": "https://www.linkedin.com/jobs/view/example-job"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "title": "Software Engineer",
    "company": "Example Company",
    "location": "Paris, France",
    "description": "...",
    "requirements": ["..."],
    "responsibilities": ["..."],
    "benefits": ["..."],
    "salary": "€50,000 - €70,000",
    "jobType": "Full-time",
    "postedDate": "2023-03-15",
    "applicationDeadline": "2023-04-15",
    "contactInfo": "jobs@example.com",
    "language": "en",
    "url": "https://www.linkedin.com/jobs/view/example-job"
  }
}
```

### POST /api/extract-job-text

Extracts job information from direct text input.

**Request:**

```json
{
  "text": "Software Engineer at Example Company..."
}
```

**Response:**
Structure is identical to the `/api/extract-job` endpoint.

## Architecture

- **Frontend**: React components with TypeScript for type safety
- **API Routes**: Next.js serverless functions for processing requests
- **AI Processing**: OpenAI GPT models for text analysis and extraction
- **Data Handling**: JSON-based structured information flow

## Error Handling

The application includes comprehensive error handling for:
- Invalid URLs
- Rate limiting
- Website access restrictions
- OpenAI API failures
- Parsing issues

## Future Enhancements

- Resume matching against job requirements
- Saved jobs library
- Application tracking integration
- Advanced filtering options
- Multiple language support beyond English and French

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the AI capabilities
- The Next.js team for their excellent framework
- The open-source community for their valuable tools and libraries