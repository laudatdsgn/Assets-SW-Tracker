# Assets & Software Tracker

A private internal web application for tracking business assets and software subscriptions, with automatic invoice processing.

## Features

- **Spaces**: Separate tracking for different business entities (OSVČ, s.r.o., etc.)
- **Assets Management**: Track physical and intangible assets with depreciation
- **Software Management**: Track subscriptions with billing periods and costs
- **Invoice Inbox**: Automatic scanning of cloud storage folders for new invoices
- **AI Analysis**: Extract invoice data using Claude API (OCR + LLM)
- **Dashboard**: Overview of assets value, software costs, upcoming payments

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (magic link + OAuth)
- **Cloud Storage**: OneDrive, Google Drive integration
- **AI**: Claude API for invoice analysis

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Cloud storage API credentials (optional)
- Anthropic API key (for invoice analysis)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Assets-SW-Tracker
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - Database URL
   - NextAuth secret and URL
   - Email provider settings (for magic link)
   - Google/Microsoft OAuth credentials (optional)
   - Cloud storage API credentials (optional)
   - Anthropic API key

5. Initialize the database:
```bash
npm run db:generate
npm run db:push
```

6. Start the development server:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for all required and optional environment variables.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected app routes
│   │   ├── dashboard/     # Dashboard page
│   │   ├── assets/        # Assets management
│   │   ├── software/      # Software management
│   │   ├── inbox/         # Invoice inbox
│   │   └── settings/      # Settings pages
│   ├── api/               # API routes
│   └── auth/              # Auth pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   ├── assets/           # Asset-specific components
│   ├── software/         # Software-specific components
│   └── inbox/            # Inbox components
├── contexts/             # React contexts
├── hooks/                # Custom hooks
├── lib/                  # Utilities and services
└── types/                # TypeScript types
```

## Key Concepts

### Spaces
- Isolate data by business entity
- Each space has its own assets, software, and invoices
- Default spaces: OSVČ (sole trader), s.r.o. (limited company)

### Invoice Processing Flow
1. Connect cloud storage (OneDrive/Google Drive)
2. Configure invoice folders to scan
3. App automatically detects new files
4. AI extracts invoice data (vendor, amount, date, etc.)
5. User reviews and creates Asset or Software entry
6. Invoice is linked to the created item

## License

Private project - not for distribution.
