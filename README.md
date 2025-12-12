# Workpad

A trustless escrow platform for freelancers powered by Solana blockchain. Post gigs, complete work, and get paid instantly with smart contract security.

## Features

- **Secure Escrow**: Funds locked in Solana smart contracts, released only when work is approved
- **Instant Payments**: Get paid in 400ms via x402 micropayments on Solana
- **Milestone Support**: Break projects into milestones for incremental payment
- **Trustless**: No middleman needed - smart contracts handle all transactions
- **Real-time Updates**: Live tracking of gig status and milestone progress

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Blockchain**: Solana (Devnet)
- **Wallet**: Solana Wallet Adapter (Phantom, Solflare, Torus)

## Prerequisites

- Node.js 18+ and npm
- A Solana wallet (Phantom, Solflare, or Torus)
- Supabase account (database is pre-configured)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The `.env` file is already configured with Supabase credentials:

```env
VITE_SUPABASE_URL=https://ivfijwyooasyiqhcvqaa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Database Setup

The database schema is already set up via Supabase migrations. The following tables are available:

- `profiles` - User profiles (client or freelancer)
- `gigs` - Job postings with escrow information
- `milestones` - Project milestones for incremental payments
- `submissions` - Work deliverables submitted by freelancers
- `transactions` - Payment transaction history

All tables have Row Level Security (RLS) enabled for data protection.

### 4. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

## How It Works

### For Clients

1. **Sign Up**: Create an account and select "Client" as your user type
2. **Connect Wallet**: Connect your Solana wallet (Phantom, Solflare, or Torus)
3. **Post a Gig**: Create a job posting with title, description, and budget
4. **Lock Funds**: Funds are locked in escrow via smart contract
5. **Review Work**: When freelancer submits, review and approve
6. **Auto Release**: Funds are automatically released from escrow to freelancer

### For Freelancers

1. **Sign Up**: Create an account and select "Freelancer" as your user type
2. **Connect Wallet**: Connect your Solana wallet
3. **Browse Gigs**: View available open gigs
4. **Accept Gig**: Click accept to start working
5. **Submit Work**: Submit your deliverables when complete
6. **Get Paid**: Receive instant payment when client approves

### Milestone-Based Projects

Projects can be broken into milestones for incremental payment:

1. Client creates a gig with multiple milestones (each with percentage of total budget)
2. Freelancer completes and submits each milestone
3. Client reviews and approves each milestone
4. Payment is released incrementally as milestones are approved

## Project Structure

```
src/
├── components/
│   ├── Auth.tsx              # Authentication UI
│   ├── ClientDashboard.tsx   # Client's gig management
│   ├── FreelancerDashboard.tsx # Freelancer's gig browser
│   ├── GigDetail.tsx         # Individual gig view
│   ├── CreateGigModal.tsx    # Gig creation form
│   ├── MilestoneTracker.tsx  # Milestone progress tracking
│   ├── Navigation.tsx        # Top navigation bar
│   ├── Landing.tsx           # Landing page
│   ├── WalletProvider.tsx    # Solana wallet configuration
│   └── Toast.tsx             # Notification system
├── lib/
│   ├── supabase.ts           # Supabase client & types
│   └── x402-fetch.ts         # x402 payment utilities
└── App.tsx                   # Main app component
```

## Solana Integration

The app uses Solana Devnet for testing. To use the platform:

1. Install a Solana wallet browser extension (Phantom recommended)
2. Switch to Devnet in your wallet settings
3. Get free Devnet SOL from a faucet: https://faucet.solana.com

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Security

- All funds are held in Solana smart contracts (escrow PDAs)
- Row Level Security (RLS) policies protect all database tables
- Users can only access their own data and relevant gigs
- Authentication handled securely via Supabase Auth
- Private keys never leave the user's wallet

## Support

For issues or questions:
- Check the browser console for error messages
- Ensure your wallet is connected and on Devnet
- Verify you have Devnet SOL for transaction fees

## License

MIT
