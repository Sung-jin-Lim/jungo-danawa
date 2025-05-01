# Jungo-Danawa

A web platform that scrapes and compares product prices across popular Korean marketplaces: Danggeun Market (당근마켓), Bunjang (번개장터), Junggonara (중고나라), and Coupang (쿠팡). Find the best deals across multiple platforms in one search.

## Features

- Search for products across multiple Korean marketplaces simultaneously
- Compare prices between different platforms
- View product images, prices, and links to original listings
- Filter results by price range and marketplace
- Select multiple items for detailed comparison

## Project Structure

```
├── backend/                # Backend server code
│   ├── api/                # API endpoints and routes
│   ├── models/             # Database models (optional with MongoDB)
│   ├── scrapers/           # Web scrapers for different platforms
│   │   ├── baseScraper.js  # Shared scraper functionality
│   │   └── ...             # Platform-specific scrapers
│   ├── services/           # Service layer (browser management, etc.)
│   └── utils/              # Utility functions
├── frontend/               # Frontend React application
│   ├── public/             # Static assets
│   └── src/                # React components and app logic
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components
│       └── services/       # API client services
└── scripts/                # Helper scripts
```

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React, TailwindCSS
- **Scraping**: Puppeteer, Cheerio
- **Database**: MongoDB (optional)
- **Image Processing**: Various strategies for extracting images

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Chrome/Chromium (for Puppeteer)
- MongoDB (optional)

## Setup Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/jungo-danawa.git
   cd jungo-danawa
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration.

3. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

4. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   ```

5. Start the development servers:

   For the backend:

   ```bash
   cd backend
   npm run dev
   ```

   For the frontend:

   ```bash
   cd frontend
   npm start
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Environment Variables

Key environment variables that can be configured in the `.env` file:

```
# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:3000

# MongoDB (optional)
MONGODB_URI=mongodb://localhost:27017/jungo-danawa

# Puppeteer Settings
HEADLESS=true
BROWSER_TIMEOUT=30000

# Sources to Scrape (default: all enabled)
ENABLE_DANGGEUN=true
ENABLE_BUNJANG=true
ENABLE_JUNGGONARA=true
ENABLE_COUPANG=true
```

## Troubleshooting

### No Search Results Showing

1. Check browser console for errors
2. Verify backend server is running
3. Make sure internet connection is working (scrapers need web access)
4. Try searching with Korean terms for better results
5. Check that all scrapers are enabled in your environment
6. Inspect the browser logs for any scraper errors
7. Try a more general search term - specific terms might not match across all platforms

### Image Loading Issues

The application uses multiple strategies to extract images from product listings. If images aren't showing:

1. Make sure the source websites haven't changed their image delivery methods
2. Check network tab for failed image requests
3. Verify that the browser has proper permissions to download images

### Puppeteer/Chrome Issues

If you encounter issues with Puppeteer:

1. Ensure Chrome/Chromium is installed on your system
2. For headless errors, try setting `HEADLESS=false` in your `.env` file
3. Increase the timeout in the `.env` file if scraping is timing out
4. For Linux users, you might need to install additional Chrome dependencies

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
