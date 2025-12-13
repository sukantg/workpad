# Quick Start: Deploy Contract

## Fastest Way to Deploy

```bash
cd solana-program

# Deploy to devnet (testing)
./deploy.sh devnet

# Or deploy to mainnet (production)
./deploy.sh mainnet-beta
```

## Manual Deployment

```bash
# 1. Build
anchor build

# 2. Deploy
anchor deploy

# 3. Save the Program ID from output
```

## After Deployment

### 1. Update Environment Variables

Add to `.env`:
```env
VITE_PROGRAM_ID=<YOUR_PROGRAM_ID_FROM_DEPLOYMENT>
VITE_SOLANA_NETWORK=devnet  # or mainnet-beta
```

### 2. Update Supabase Function

In Supabase Dashboard → Edge Functions → milestone-orchestrator:

Add environment variable:
```
PROGRAM_ID=<YOUR_PROGRAM_ID>
SOLANA_NETWORK=devnet
```

### 3. Test

1. Create a gig with milestones
2. Accept the gig
3. Submit a milestone
4. Approve and release payment
5. Verify funds transfer

## Troubleshooting

**Build fails?**
```bash
anchor clean
anchor build
```

**Deployment fails?**
```bash
# Check balance
solana balance

# Get more SOL (devnet)
solana airdrop 2
```

**Program ID mismatch?**
```bash
anchor keys sync
anchor build
```

## Need Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions.


