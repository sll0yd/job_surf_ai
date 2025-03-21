# JobSurf AI

A Next.js application that extracts job information from various job platforms using AI.

## Features

- Extracts detailed job information from various job platforms (LinkedIn, Glassdoor, Indeed, Welcome to the Jungle, etc.)
- Supports both English and French job listings
- Provides structured JSON output for easy integration with other systems
- Responsive UI with both "pretty" and raw JSON views
- Built with Next.js 15.2.3, TypeScript, and Tailwind CSS

## Tech Stack

- Next.js 15.2.3
- TypeScript
- Tailwind CSS
- OpenAI API (GPT-4o)
- Axios for API requests
- Cheerio for HTML parsing

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

Copy the template file and add your OpenAI API key:

```bash
cp .env.local.template .env.local
```

Then edit `.env.local` to add your actual OpenAI API key.

### Development

Run the development server:

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

1. Enter a job listing URL from LinkedIn, Welcome to the Jungle, Glassdoor, or Indeed
2. Click "Extract Info" to analyze the job listing
3. View the extracted information in either the pretty view or JSON format
4. Copy the JSON data for integration with other systems

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
  "data": {
    "title": "Software Engineer",
    "company": "Example Company",
    "location": "Paris, France",
    "description": "...",
    "requirements": ["..."],
    "responsibilities": ["..."],
    "benefits": ["..."],
    "salary": "€50,000 - €70,000",
    "employmentType": "Full-time",
    "experienceLevel": "Mid-level",
    "contactInfo": "jobs@example.com",
    "postedDate": "2025-03-15",
    "deadline": "2025-04-15",
    "platform": "LinkedIn",
    "language": "en",
    "url": "https://www.linkedin.com/jobs/view/example-job"
  }
}
```

## License

This project is licensed under the MIT License.