use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("JBRL2c7Bu9FdygTcVyadbWdyPubNSL1igRg32CuLaUZ4");

#[program]
pub mod milestone_escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        gig_id: String,
        total_amount: u64,
        milestone_count: u8,
        milestone_amounts: Option<Vec<u64>>,
    ) -> Result<()> {
        require!(total_amount > 0, EscrowError::InvalidAmount);
        require!(milestone_count > 0, EscrowError::InvalidMilestoneCount);
        require!(
            milestone_count <= 20,
            EscrowError::InvalidMilestoneCount
        );

        // Validate milestone amounts if provided
        if let Some(ref amounts) = milestone_amounts {
            require!(
                amounts.len() == milestone_count as usize,
                EscrowError::InvalidMilestoneAmounts
            );
            let sum: u64 = amounts.iter().sum();
            require!(sum == total_amount, EscrowError::InvalidMilestoneAmounts);
            require!(
                amounts.iter().all(|&a| a > 0),
                EscrowError::InvalidMilestoneAmounts
            );
        }

        let escrow = &mut ctx.accounts.escrow;
        escrow.client = ctx.accounts.client.key();
        escrow.freelancer = Pubkey::default();
        escrow.gig_id = gig_id;
        escrow.total_amount = total_amount;
        escrow.paid_amount = 0;
        escrow.milestone_count = milestone_count;
        escrow.current_milestone = 0;
        escrow.status = EscrowStatus::Initialized;
        escrow.bump = ctx.bumps.escrow;

        // Store milestone amounts if provided (empty vec means equal milestones)
        if let Some(amounts) = milestone_amounts {
            escrow.milestone_amounts = amounts;
        } else {
            escrow.milestone_amounts = Vec::new();
        }

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.client_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.client.to_account_info(),
                },
            ),
            total_amount,
        )?;

        Ok(())
    }

    pub fn assign_freelancer(
        ctx: Context<AssignFreelancer>,
        freelancer: Pubkey,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            escrow.status == EscrowStatus::Initialized,
            EscrowError::InvalidStatus
        );
        escrow.freelancer = freelancer;
        escrow.status = EscrowStatus::InProgress;
        Ok(())
    }

    pub fn release_milestone(
        ctx: Context<ReleaseMilestone>,
        amount_to_release: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.escrow.status == EscrowStatus::InProgress,
            EscrowError::InvalidStatus
        );

        require!(
            ctx.accounts.escrow.freelancer != Pubkey::default(),
            EscrowError::FreelancerNotAssigned
        );

        require!(amount_to_release > 0, EscrowError::InvalidAmount);

        require!(
            ctx.accounts.escrow.paid_amount + amount_to_release <= ctx.accounts.escrow.total_amount,
            EscrowError::ExceedsTotalAmount
        );

        require!(
            ctx.accounts.escrow.current_milestone < ctx.accounts.escrow.milestone_count,
            EscrowError::ExceedsMilestoneCount
        );

        // Validate milestone amount
        if !ctx.accounts.escrow.milestone_amounts.is_empty() {
            // Predefined milestone amounts
            let expected_amount = ctx.accounts.escrow.milestone_amounts[ctx.accounts.escrow.current_milestone as usize];
            require!(
                amount_to_release == expected_amount,
                EscrowError::InvalidMilestoneAmount
            );
        } else {
            // Equal milestones - allow remainder on last milestone
            let base_amount = ctx.accounts.escrow.total_amount / ctx.accounts.escrow.milestone_count as u64;
            let remainder = ctx.accounts.escrow.total_amount % ctx.accounts.escrow.milestone_count as u64;
            let is_last_milestone = ctx.accounts.escrow.current_milestone == ctx.accounts.escrow.milestone_count - 1;
            
            if is_last_milestone {
                // Last milestone gets base_amount + remainder
                require!(
                    amount_to_release == base_amount + remainder,
                    EscrowError::InvalidMilestoneAmount
                );
            } else {
                // Other milestones must be exactly base_amount
                require!(
                    amount_to_release == base_amount,
                    EscrowError::InvalidMilestoneAmount
                );
            }
        }

        require!(
            ctx.accounts.client.key() == ctx.accounts.escrow.client,
            EscrowError::Unauthorized
        );

        let gig_id = ctx.accounts.escrow.gig_id.clone();
        let bump = ctx.accounts.escrow.bump;
        let seeds = &[
            b"escrow",
            gig_id.as_bytes(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.freelancer_token_account.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            amount_to_release,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.paid_amount += amount_to_release;
        escrow.current_milestone += 1;

        if escrow.paid_amount == escrow.total_amount {
            escrow.status = EscrowStatus::Completed;
        }

        Ok(())
    }

    pub fn refund_escrow(ctx: Context<RefundEscrow>) -> Result<()> {
        require!(
            ctx.accounts.client.key() == ctx.accounts.escrow.client,
            EscrowError::Unauthorized
        );

        require!(
            ctx.accounts.escrow.status != EscrowStatus::Completed,
            EscrowError::AlreadyCompleted
        );

        let remaining_amount = ctx.accounts.escrow.total_amount - ctx.accounts.escrow.paid_amount;

        if remaining_amount > 0 {
            let gig_id = ctx.accounts.escrow.gig_id.clone();
            let bump = ctx.accounts.escrow.bump;
            let seeds = &[
                b"escrow",
                gig_id.as_bytes(),
                &[bump],
            ];
            let signer = &[&seeds[..]];

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_token_account.to_account_info(),
                        to: ctx.accounts.client_token_account.to_account_info(),
                        authority: ctx.accounts.escrow.to_account_info(),
                    },
                    signer,
                ),
                remaining_amount,
            )?;
        }

        let escrow = &mut ctx.accounts.escrow;
        escrow.status = EscrowStatus::Refunded;
        Ok(())
    }

    pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
        require!(
            ctx.accounts.escrow.status == EscrowStatus::Completed
                || ctx.accounts.escrow.status == EscrowStatus::Refunded,
            EscrowError::InvalidStatus
        );

        require!(
            ctx.accounts.client.key() == ctx.accounts.escrow.client,
            EscrowError::Unauthorized
        );

        // Verify all funds have been transferred
        require!(
            ctx.accounts.escrow.paid_amount == ctx.accounts.escrow.total_amount
                || ctx.accounts.escrow.status == EscrowStatus::Refunded,
            EscrowError::FundsNotReleased
        );

        // Account will be closed and rent refunded to client via @close attribute
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(gig_id: String)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = client,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", gig_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        constraint = client_token_account.owner == client.key() @ EscrowError::InvalidTokenAccount
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = escrow_token_account.owner == escrow.key() @ EscrowError::InvalidTokenAccount,
        constraint = escrow_token_account.mint == client_token_account.mint @ EscrowError::MintMismatch
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AssignFreelancer<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.gig_id.as_bytes()],
        bump = escrow.bump,
        has_one = client
    )]
    pub escrow: Account<'info, Escrow>,

    pub client: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReleaseMilestone<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.gig_id.as_bytes()],
        bump = escrow.bump,
        has_one = client
    )]
    pub escrow: Account<'info, Escrow>,

    pub client: Signer<'info>,

    #[account(
        mut,
        constraint = escrow_token_account.owner == escrow.key() @ EscrowError::InvalidTokenAccount,
        constraint = escrow_token_account.mint == freelancer_token_account.mint @ EscrowError::MintMismatch
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = freelancer_token_account.owner == escrow.freelancer @ EscrowError::InvalidTokenAccount
    )]
    pub freelancer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefundEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.gig_id.as_bytes()],
        bump = escrow.bump,
        has_one = client
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        constraint = escrow_token_account.owner == escrow.key() @ EscrowError::InvalidTokenAccount,
        constraint = escrow_token_account.mint == client_token_account.mint @ EscrowError::MintMismatch
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = client_token_account.owner == client.key() @ EscrowError::InvalidTokenAccount
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.gig_id.as_bytes()],
        bump = escrow.bump,
        has_one = client,
        close = client
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub client: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub client: Pubkey,
    pub freelancer: Pubkey,
    #[max_len(50)]
    pub gig_id: String,
    pub total_amount: u64,
    pub paid_amount: u64,
    pub milestone_count: u8,
    pub current_milestone: u8,
    pub status: EscrowStatus,
    pub bump: u8,
    #[max_len(20)]
    pub milestone_amounts: Vec<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum EscrowStatus {
    Initialized,
    InProgress,
    Completed,
    Refunded,
}

#[error_code]
pub enum EscrowError {
    #[msg("Invalid escrow status for this operation")]
    InvalidStatus,
    #[msg("Amount exceeds total escrow amount")]
    ExceedsTotalAmount,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Escrow already completed")]
    AlreadyCompleted,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Token mint mismatch")]
    MintMismatch,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid milestone count")]
    InvalidMilestoneCount,
    #[msg("Freelancer not assigned")]
    FreelancerNotAssigned,
    #[msg("Exceeds milestone count")]
    ExceedsMilestoneCount,
    #[msg("Invalid milestone amount")]
    InvalidMilestoneAmount,
    #[msg("Invalid milestone amounts configuration")]
    InvalidMilestoneAmounts,
    #[msg("Funds not fully released")]
    FundsNotReleased,
}
