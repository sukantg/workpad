#!/bin/bash

# Solana Contract Deployment Script
# Usage: ./deploy.sh [devnet|mainnet|mainnet-beta]

set -e

NETWORK=${1:-devnet}

# Helper function to convert lamports to SOL (works without bc)
lamports_to_sol() {
    local lamports=$1
    # Ensure we have a valid number
    if ! [[ "$lamports" =~ ^[0-9]+$ ]]; then
        echo "0.00"
        return
    fi
    if command -v bc >/dev/null 2>&1; then
        echo "scale=2; $lamports / 1000000000" | bc
    else
        # Fallback: use awk or simple division
        awk "BEGIN {printf \"%.2f\", $lamports / 1000000000}" 2>/dev/null || \
        echo "$((lamports / 1000000000)).$(( (lamports % 1000000000) / 10000000 ))"
    fi
}

# Helper function to get balance in lamports
get_balance_lamports() {
    local balance_output
    # Try --lamports flag first (newer Solana CLI)
    balance_output=$(solana balance --lamports 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$balance_output" ]; then
        # Extract numeric value from "5000000000 lamports" format
        echo "$balance_output" | grep -oE '^[0-9]+' | head -1
    else
        # Fallback: parse from regular balance output "5 SOL"
        balance_output=$(solana balance 2>/dev/null)
        if [ $? -eq 0 ] && [ -n "$balance_output" ]; then
            # Extract SOL amount and convert to lamports
            local sol_amount=$(echo "$balance_output" | grep -oE '[0-9]+\.[0-9]+' | head -1)
            if [ -z "$sol_amount" ]; then
                # Try integer format "5 SOL"
                sol_amount=$(echo "$balance_output" | grep -oE '^[0-9]+' | head -1)
            fi
            if [ -n "$sol_amount" ]; then
                # Convert SOL to lamports (multiply by 1 billion)
                if command -v bc >/dev/null 2>&1; then
                    echo "scale=0; $sol_amount * 1000000000" | bc | cut -d. -f1
                else
                    # Use awk for conversion
                    awk "BEGIN {printf \"%.0f\", $sol_amount * 1000000000}" 2>/dev/null
                fi
            fi
        fi
    fi
}

# Normalize network name (allow 'mainnet' as alias for 'mainnet-beta')
if [ "$NETWORK" == "mainnet" ]; then
    NETWORK="mainnet-beta"
fi

echo "Deploying Milestone Escrow Contract to $NETWORK..."

# Validate network
if [ "$NETWORK" != "devnet" ] && [ "$NETWORK" != "mainnet-beta" ] && [ "$NETWORK" != "testnet" ]; then
    echo "Invalid network. Use 'devnet', 'testnet', 'mainnet', or 'mainnet-beta'"
    exit 1
fi

# Set Solana cluster
echo "Setting Solana cluster to $NETWORK..."
solana config set --url $NETWORK

# Check wallet
echo "Checking wallet..."
WALLET_ADDRESS=$(solana address)
echo "Wallet: $WALLET_ADDRESS"

# Check balance
INITIAL_BALANCE=$(get_balance_lamports)
if [ -z "$INITIAL_BALANCE" ] || ! [[ "$INITIAL_BALANCE" =~ ^[0-9]+$ ]]; then
    echo "Could not retrieve or parse wallet balance"
    echo "   Please check your Solana CLI installation and wallet configuration"
    exit 1
fi
INITIAL_BALANCE_SOL=$(lamports_to_sol $INITIAL_BALANCE)
echo "Balance: $INITIAL_BALANCE_SOL SOL ($INITIAL_BALANCE lamports)"

# Deployment cost estimation (rough: ~0.5-2 SOL depending on program size)
MIN_BALANCE_REQUIRED=500000000  # 0.5 SOL minimum
RECOMMENDED_BALANCE=2000000000  # 2 SOL recommended

if [ "$NETWORK" == "devnet" ] || [ "$NETWORK" == "testnet" ]; then
    # Request airdrop if balance is below recommended threshold
    BALANCE=$INITIAL_BALANCE
    if [ "$BALANCE" -lt $RECOMMENDED_BALANCE ]; then
        AIRDROP_AMOUNT=2
        echo "💰 Balance is low. Requesting $AIRDROP_AMOUNT SOL airdrop..."
        solana airdrop $AIRDROP_AMOUNT
        sleep 2  # Wait for airdrop to confirm
        BALANCE=$(get_balance_lamports)
        if [ -n "$BALANCE" ] && [[ "$BALANCE" =~ ^[0-9]+$ ]]; then
            BALANCE_SOL=$(lamports_to_sol $BALANCE)
            echo "New balance: $BALANCE_SOL SOL"
        else
            echo "Could not verify new balance, but airdrop was requested"
        fi
    fi
else
    # Mainnet: Check if balance is sufficient
    BALANCE=$INITIAL_BALANCE
    if [ "$BALANCE" -lt $MIN_BALANCE_REQUIRED ]; then
        echo "Insufficient balance for deployment!"
        echo "   Required: ~0.5 SOL minimum"
        echo "   Current: $INITIAL_BALANCE_SOL SOL"
        exit 1
    fi
    
    if [ "$BALANCE" -lt $RECOMMENDED_BALANCE ]; then
        echo "Warning: Balance may be low for deployment"
        echo "   Recommended: 2+ SOL"
        echo "   Current: $INITIAL_BALANCE_SOL SOL"
    fi
    
    echo "Mainnet deployment requires real SOL"
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the program
echo "🔨 Building program..."
anchor build

# Check program size (for cost estimation)
if [ -f "target/deploy/milestone_escrow.so" ]; then
    SO_SIZE=$(stat -f%z target/deploy/milestone_escrow.so 2>/dev/null || stat -c%s target/deploy/milestone_escrow.so 2>/dev/null || echo "0")
    if command -v bc >/dev/null 2>&1; then
        SO_SIZE_MB=$(echo "scale=2; $SO_SIZE / 1048576" | bc)
    else
        SO_SIZE_MB=$(awk "BEGIN {printf \"%.2f\", $SO_SIZE / 1048576}" 2>/dev/null || echo "N/A")
    fi
    echo "Program size: $SO_SIZE bytes ($SO_SIZE_MB MB)"
    
    # Warn if program is very large (may require buffer deployment)
    if [ "$SO_SIZE" -gt 1048576 ]; then  # > 1MB
        echo "Large program detected. Deployment may require buffer method."
    fi
else
    echo "Build failed: program binary not found"
    exit 1
fi

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/milestone_escrow-keypair.json 2>/dev/null || echo "")
if [ -z "$PROGRAM_ID" ]; then
    echo "Could not read program ID from keypair. Anchor will generate it."
else
    echo "Program ID: $PROGRAM_ID"
fi

# Deploy
echo "Deploying program..."
if anchor deploy; then
    # Extract program ID from Anchor output if not already set
    if [ -z "$PROGRAM_ID" ]; then
        PROGRAM_ID=$(solana address -k target/deploy/milestone_escrow-keypair.json 2>/dev/null || echo "")
    fi
    
    # Verify deployment
    echo "erifying deployment..."
    if [ -n "$PROGRAM_ID" ]; then
        solana program show $PROGRAM_ID
        
        # Get final balance after deployment
        FINAL_BALANCE=$(get_balance_lamports)
        if [ -n "$FINAL_BALANCE" ] && [[ "$FINAL_BALANCE" =~ ^[0-9]+$ ]]; then
            FINAL_BALANCE_SOL=$(lamports_to_sol $FINAL_BALANCE)
            # Calculate cost (handle potential negative if balance increased)
            if [ "$FINAL_BALANCE" -le "$INITIAL_BALANCE" ]; then
                COST_LAMPORTS=$((INITIAL_BALANCE - FINAL_BALANCE))
            else
                COST_LAMPORTS=0
            fi
            COST_SOL=$(lamports_to_sol $COST_LAMPORTS)
        else
            FINAL_BALANCE_SOL="N/A"
            COST_SOL="N/A"
        fi
        
        echo ""
        echo "Deployment complete!"
        echo "Program ID: $PROGRAM_ID"
        echo "Network: $NETWORK"
        echo "Deployment cost: ~$COST_SOL SOL"
        echo "Remaining balance: $FINAL_BALANCE_SOL SOL"
        echo ""
        echo "Next steps:"
        echo "1. Update VITE_PROGRAM_ID=$PROGRAM_ID in .env file"
        echo "2. Update Supabase function environment variables:"
        echo "   PROGRAM_ID=$PROGRAM_ID"
        echo "   SOLANA_NETWORK=$NETWORK"
        echo "3. Test the integration"
    else
        echo "Deployment completed but could not verify program ID"
        echo "   Check Anchor output above for the Program ID"
    fi
else
    echo "Deployment failed!"
    echo "   Check the error messages above"
    exit 1
fi
