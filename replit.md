# MAD Vibe - Human/AI Pairing Financial Analysis Platform

## Overview

MAD Vibe is a production-ready financial analysis platform designed for collaborative investment research and valuation workflows. The application combines modern web technologies with AI-powered research assistance to provide comprehensive tools for data normalization, owner earnings analysis, DCF valuation modeling, memo composition, scenario planning, and portfolio monitoring. Built with an Express + Vite React architecture, the platform offers real-time collaboration features and session-scoped workflow state management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Hybrid Frontend Architecture

The application uses a unique dual-frontend approach combining Next.js and Vite:

- **Next.js App Router**: Handles server-side rendered admin dashboard pages with TypeScript and React Server Components
- **Vite Client**: Powers interactive client-side features with React and TypeScript
- **Shared Component System**: shadcn/ui components with Tailwind CSS for consistent design
- **WebSocket Integration**: Real-time features for live updates and notifications

### Backend Architecture

- **Express.js Server**: RESTful API with structured logging and middleware for request handling
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Admin token-based authentication with smoke mode for testing
- **WebSocket Server**: Real-time communication for live updates and operational features

### Database Design

- **PostgreSQL**: Primary database with connection pooling and migration support
- **Drizzle Schema**: Type-safe schema definitions for users, customers, staff, services, appointments, and inventory
- **Migration System**: Automated database migrations with version control
- **Backup System**: Automated backup creation and management

### State Management

- **TanStack Query**: Client-side data fetching and caching for API interactions
- **Context Providers**: WebSocket and theme management through React Context
- **Form Handling**: React Hook Form with Zod validation for type-safe form processing

### Build and Development

- **TypeScript**: Strict type checking across the entire codebase
- **ESLint**: Comprehensive linting with React and TypeScript rules
- **Vite**: Fast development server and optimized production builds
- **esbuild**: Server bundling for production deployment

## External Dependencies

### Core Infrastructure

- **Neon Database**: Serverless PostgreSQL hosting with WebSocket constructor configuration
- **Replit**: Development environment integration with runtime error overlay and cartographer

### AI and Analytics

- **OpenAI API**: GPT-5 integration for AI-powered scheduling optimization and business insights
- **Custom AI Search**: Intelligent search functionality with context-aware results

### Payment Processing

- **Stripe**: Payment processing with React Stripe.js integration for subscription and transaction handling

### UI and Design

- **Radix UI**: Comprehensive component library for accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **Font Awesome**: Additional icon support for business-specific graphics

### Development and Monitoring

- **WebSocket (ws)**: Real-time communication infrastructure
- **Structured Logging**: Custom logging system for operational monitoring
- **Health Monitoring**: Built-in health checks and system status reporting
