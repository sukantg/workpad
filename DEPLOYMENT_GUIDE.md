# Solana Contract Deployment Guide

Complete guide to deploy and get your milestone escrow contract working live.

## Prerequisites

### 1. Install Required Tools

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Verify installations
solana --version
anchor --version
```

### 2. Setup Solana Wallet

```bash
# Generate a new keypair (if you don't have one)
solana-keygen new --outfile ~/.config/solana/id.json

# For devnet (testing)
solana config set --url devnet
solana airdrop 2  # Get free SOL for testing

# For mainnet (production)
solana config set --url mainnet-beta
# You'll need real SOL for mainnet deployment
```

### 3. Verify Anchor.toml Configuration

Your `Anchor.toml` should have:
```toml
[programs.devnet]
milestone_escrow = "YOUR_PROGRAM_ID"  # Will be auto-generated

[provider]
cluster = "devnet"  # or "mainnet-beta" for production
wallet = "~/.config/solana/id.json"
```

## Step-by-Step Deployment

### Step 1: Build the Contract

```bash
cd solana-program

# Build the program (this will sync program IDs automatically)
anchor build

# This will:
# - Generate the program ID if needed
# - Create the IDL (Interface Definition Language)
# - Compile the program
# - Output files to target/deploy/
```

**Expected Output:**
- `target/deploy/milestone_escrow.so` - Compiled program
- `target/idl/milestone_escrow.json` - IDL file
- Program ID will be synced in `lib.rs` and `Anchor.toml`

### Step 2: Deploy to Devnet (Testing)

```bash
# Make sure you're on devnet
solana config set --url devnet

# Get some SOL for deployment (if needed)
solana airdrop 2

# Deploy the program
anchor deploy

# Or deploy manually:
# solana program deploy target/deploy/milestone_escrow.so
```

**Save the Program ID** from the output - you'll need it for integration.

### Step 3: Verify Deployment

```bash
# Check your program
solana program show <PROGRAM_ID>

# View program account
solana account <PROGRAM_ID>
```

### Step 4: Update Frontend/Backend Integration

#### Update Environment Variables

Create/update `.env` file:
```env
# Solana Configuration
VITE_SOLANA_NETWORK=devnet  # or mainnet-beta
VITE_PROGRAM_ID=<YOUR_PROGRAM_ID>
VITE_USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # Devnet USDC
```

For mainnet USDC:
```env
VITE_USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # Mainnet USDC
```

#### Update Frontend Code

Update `src/lib/supabase.ts` or wherever you store the program ID:

```typescript
export const PROGRAM_ID = new PublicKey(import.meta.env.VITE_PROGRAM_ID);
export const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
```

#### Update Backend (Supabase Function)

Update `supabase/functions/milestone-orchestrator/index.ts`:

```typescript
const PROGRAM_ID = Deno.env.get('PROGRAM_ID') || 'YOUR_PROGRAM_ID';
const SOLANA_NETWORK = Deno.env.get('SOLANA_NETWORK') || 'devnet';
```

### Step 5: Deploy to Mainnet (Production)

⚠️ **Important**: Test thoroughly on devnet first!

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Update Anchor.toml
[programs.mainnet]
milestone_escrow = "YOUR_PROGRAM_ID"

[provider]
cluster = "mainnet-beta"

# Build for mainnet
anchor build

# Deploy (requires real SOL)
anchor deploy

# Or with upgrade authority:
solana program deploy \
  --program-id target/deploy/milestone_escrow-keypair.json \
  target/deploy/milestone_escrow.so
```

**Cost**: Mainnet deployment costs ~2-3 SOL (rent + fees)

## Integration Checklist

### Frontend Integration

- [ ] Update program ID in environment variables
- [ ] Update network configuration (devnet/mainnet)
- [ ] Update USDC mint address for the network
- [ ] Test wallet connection
- [ ] Test escrow initialization
- [ ] Test milestone release

### Backend Integration

- [ ] Update Supabase function with program ID
- [ ] Set environment variables in Supabase dashboard
- [ ] Test milestone orchestrator function
- [ ] Verify transaction signing works

### Testing Steps

1. **Test Escrow Initialization**
   ```typescript
   // Create a test gig with milestones
   // Verify escrow PDA is created
   // Verify funds are locked
   ```

2. **Test Milestone Release**
   ```typescript
   // Submit a milestone
   // Approve and release payment
   // Verify funds transfer correctly
   ```

3. **Test Refund**
   ```typescript
   // Cancel a gig
   // Request refund
   // Verify funds return to client
   ```

4. **Test Account Closure**
   ```typescript
   // Complete all milestones
   // Close escrow account
   // Verify rent is refunded
   ```

## Common Issues & Solutions

### Issue: Program ID Mismatch

**Solution:**
```bash
# Sync program IDs
anchor keys sync

# Rebuild
anchor build
```

### Issue: Insufficient SOL

**Solution:**
```bash
# Devnet: Get free SOL
solana airdrop 2

# Mainnet: Transfer SOL to your wallet
```

### Issue: Build Errors

**Solution:**
```bash
# Clean and rebuild
anchor clean
anchor build

# Check Anchor version matches
anchor --version
# Should match Cargo.toml version (0.29.0)
```

### Issue: Deployment Fails

**Solution:**
```bash
# Check wallet balance
solana balance

# Check program size
ls -lh target/deploy/milestone_escrow.so

# Try deploying with buffer
solana program deploy \
  --buffer target/deploy/milestone_escrow.so \
  --program-id target/deploy/milestone_escrow-keypair.json
```

## Program Upgrade (After Initial Deployment)

If you need to update the program:

```bash
# Build new version
anchor build

# Deploy upgrade
anchor upgrade target/deploy/milestone_escrow.so \
  --program-id <EXISTING_PROGRAM_ID>

# Or use buffer method for larger programs
solana program write-buffer target/deploy/milestone_escrow.so
solana program set-buffer-authority <BUFFER_ID> --new-buffer-authority <YOUR_KEYPAIR>
solana program deploy --program-id <PROGRAM_ID> <BUFFER_ID>
```

## Security Checklist

Before going live:

- [ ] Code audit completed
- [ ] All tests passing
- [ ] Tested on devnet thoroughly
- [ ] Program ID verified
- [ ] Upgrade authority secured (consider multisig)
- [ ] Environment variables secured
- [ ] Frontend validates all inputs
- [ ] Error handling implemented
- [ ] Monitoring/logging setup

## Monitoring & Maintenance

### View Program Logs

```bash
# Watch program logs
solana logs <PROGRAM_ID>

# View recent transactions
solana confirm <TRANSACTION_SIGNATURE>
```

### Check Program Status

```bash
# Program info
solana program show <PROGRAM_ID>

# Account info
solana account <ESCROW_PDA_ADDRESS>
```

## Next Steps After Deployment

1. **Update Documentation**: Document the deployed program ID and network
2. **Set Up Monitoring**: Monitor program usage and errors
3. **User Testing**: Have beta users test the system
4. **Gradual Rollout**: Start with limited users, then expand
5. **Backup**: Save program keypair securely (for upgrades)

## Support Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Explorer](https://explorer.solana.com/) - View transactions
- [Anchor Book](https://book.anchor-lang.com/) - Anchor tutorials

## Quick Reference Commands

```bash
# Build
anchor build

# Deploy
anchor deploy

# Test
anchor test

# Clean
anchor clean

# Sync IDs
anchor keys sync

# View logs
solana logs <PROGRAM_ID>

# Check balance
solana balance

# Airdrop (devnet only)
solana airdrop 2
```
