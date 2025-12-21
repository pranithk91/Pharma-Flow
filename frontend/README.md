# PharmaFlow IMS - Frontend

A modern React + TypeScript frontend application for the PharmaFlow Inventory Management System. Built with Vite, React Router, and Tailwind CSS for a fast, responsive user experience.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** (Node.js 20+ recommended)
- **npm** or **yarn** (package manager)
- **Git** (for cloning the repository)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd IMS-Fretboard-v1/frontend
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Environment Configuration

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:10000

# Optional: Gemini API (if using AI features)
GEMINI_API_KEY=your-gemini-api-key-here
```

**Important:**

- Update `VITE_API_BASE_URL` to match your backend server URL
- For production, use your deployed backend URL (e.g., `https://api.yourdomain.com`)

### 4. Run the Development Server

```bash
# Using npm
npm run dev

# Or using yarn
yarn dev
```

The application will be available at `http://localhost:3000` (or the port shown in terminal)

### 5. Build for Production

```bash
# Using npm
npm run build

# Or using yarn
yarn build
```

The production build will be in the `dist/` directory.

### 6. Preview Production Build

```bash
# Using npm
npm run preview

# Or using yarn
yarn preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── ui/              # UI components (Button, Input, Modal, etc.)
│   │   └── Sidebar.tsx      # Main navigation sidebar
│   ├── pages/               # Page components
│   │   ├── Login.tsx        # Login page
│   │   ├── OP.tsx           # Patient registration
│   │   ├── Pharmacy.tsx     # Pharmacy operations
│   │   ├── Inventory.tsx    # Inventory management
│   │   ├── Reports.tsx     # Reports and analytics
│   │   ├── ViewSales.tsx    # Sales viewing
│   │   ├── Returns.tsx      # Returns management
│   │   └── Payments.tsx    # Payment processing
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication context
│   ├── hooks/               # Custom React hooks
│   │   ├── useApi.ts        # API call hook
│   │   ├── useToast.tsx     # Toast notification hook
│   │   └── useDebouncedSearch.ts
│   ├── utils/               # Utility functions
│   │   └── api.ts           # API client configuration
│   ├── types/               # TypeScript type definitions
│   │   ├── types.ts         # Shared types
│   │   └── api.ts           # API response types
│   ├── App.tsx              # Main app component
│   └── index.tsx            # Application entry point
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
└── .env                     # Environment variables (create this)
```

## 🎨 Features

- **Modern UI/UX**: Clean, professional design with Tailwind CSS
- **Type Safety**: Full TypeScript support
- **Authentication**: JWT-based authentication with protected routes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Toast notifications for user feedback
- **Accessibility**: ARIA attributes and keyboard navigation support
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🔧 Configuration

### API Base URL

The frontend communicates with the backend API. Configure the base URL in `.env`:

```env
VITE_API_BASE_URL=http://localhost:10000
```

### CORS

Ensure your backend CORS configuration includes your frontend URL. In the backend `.env`:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 📦 Dependencies

### Core Dependencies

- **react** ^19.2.0 - React library
- **react-dom** ^19.2.0 - React DOM rendering
- **react-router-dom** ^6.20.0 - Client-side routing
- **axios** ^1.6.0 - HTTP client
- **lucide-react** ^0.555.0 - Icon library
- **recharts** ^3.5.1 - Chart library for reports

### Dev Dependencies

- **vite** ^6.2.0 - Build tool and dev server
- **typescript** ~5.8.2 - TypeScript compiler
- **@vitejs/plugin-react** ^5.0.0 - Vite React plugin

## 🎯 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔐 Authentication Flow

1. User logs in via `/login`
2. Backend returns JWT token
3. Token stored in `localStorage`
4. Token included in API requests via Authorization header
5. Protected routes check authentication status
6. Auto-redirect to login if token is invalid/expired

## 🎨 Styling

The application uses:

- **Tailwind CSS** (via CDN in `index.html`)
- Custom color palette (primary teal, surface grays)
- Custom fonts: Outfit (headings) + DM Sans (body)
- Responsive breakpoints
- Dark mode support for sidebar

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is in use, Vite will automatically use the next available port. Check the terminal output for the actual URL.

### API Connection Errors

- Verify `VITE_API_BASE_URL` in `.env` matches your backend URL
- Ensure backend server is running
- Check CORS configuration in backend
- Verify network connectivity

### Build Errors

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)
- Clear Vite cache: `rm -rf node_modules/.vite`

### TypeScript Errors

- Run `npm run build` to see detailed TypeScript errors
- Ensure all dependencies are installed
- Check `tsconfig.json` configuration

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Static Hosting

The `dist/` folder can be deployed to:

- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop `dist/` folder
- **GitHub Pages**: Configure to serve from `dist/`
- **AWS S3 + CloudFront**: Upload `dist/` contents

### Environment Variables in Production

Set environment variables in your hosting platform:

- `VITE_API_BASE_URL` - Your production backend URL

**Note:** Vite requires the `VITE_` prefix for environment variables to be exposed to the client.

## 📝 Development Guidelines

### Code Style

- Use TypeScript for all new files
- Follow functional component patterns
- Use custom hooks for reusable logic
- Prefer composition over inheritance

### Component Structure

```typescript
import React from 'react';

interface ComponentProps {
  // Props here
}

export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    // JSX
  );
};
```

### Error Handling

- Always use try-catch for async operations
- Use the `useToast` hook for user notifications
- Provide meaningful error messages

## 🔒 Security Notes

- Never commit `.env` files
- API tokens are stored in `localStorage` (consider httpOnly cookies for production)
- All API requests include JWT tokens in headers
- CORS is configured on the backend
