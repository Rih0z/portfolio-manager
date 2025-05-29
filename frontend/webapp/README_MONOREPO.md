# Portfolio Manager Monorepo

This is a monorepo containing both frontend and backend code for the Portfolio Manager application.

## Structure

```
portfolio-manager/
├── frontend/
│   └── webapp/        # React web application
└── backend/           # Backend API (AWS Lambda functions)
```

## Development

### Frontend (Web App)

```bash
# Install dependencies
cd frontend/webapp
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Backend

```bash
# Install dependencies
cd backend
npm install

# Start development server
npm run dev
```

## Deployment

The frontend is automatically deployed to Cloudflare Pages when pushing to the main branch via GitHub Actions.

