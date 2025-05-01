# Jungo-Danawa

A web platform that scrapes data from second-hand item selling websites (Danggeun, Bunjang) and compares them with market prices (Coupang) to find the best deals.

## Features

- Web scraping from major second-hand websites (Danggeun, Bunjang) and e-commerce platforms (Coupang)
- Price comparison between market prices and second-hand deals
- AI-powered tech product comparison based on specifications
- Rating system for best deals in different price ranges

## Project Structure

```
├── backend/            # Backend server code
│   ├── scrapers/       # Web scrapers for different platforms
│   ├── api/            # API endpoints
│   ├── models/         # Database models
│   └── services/       # Business logic services
├── frontend/           # Frontend React application
├── database/           # Database configuration
└── docs/               # Documentation
```

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: React.js
- **Database**: MongoDB
- **Scraping**: Puppeteer/Cheerio
- **AI Integration**: OpenAI API for product comparison

## Setup Instructions

1. Clone the repository
2. Install dependencies for backend and frontend
3. Set up environment variables
4. Run the development servers

## Development

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd frontend
npm install

# Run backend development server
cd backend
npm run dev

# Run frontend development server
cd frontend
npm start
```

## License

MIT
