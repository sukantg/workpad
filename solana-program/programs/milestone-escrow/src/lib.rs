use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("MiLe5TonE111111111111111111111111111111111");

#[program]
pub mod milestone_escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        gig_id: String,
        total_amount: u64,
        milestone_count: u8,
    ) -> Result<()> {
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
        let escrow = &mut ctx.accounts.escrow;

        require!(
            escrow.status == EscrowStatus::InProgress,
            EscrowError::InvalidStatus
        );

        require!(
            escrow.paid_amount + amount_to_release <= escrow.total_amount,
            EscrowError::ExceedsTotalAmount
        );

        require!(
            ctx.accounts.client.key() == escrow.client,
            EscrowError::Unauthorized
        );

        let gig_id = escrow.gig_id.clone();
        let seeds = &[
            b"escrow",
            gig_id.as_bytes(),
            &[escrow.bump],
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

        escrow.paid_amount += amount_to_release;
        escrow.current_milestone += 1;

        if escrow.paid_amount == escrow.total_amount {
            escrow.status = EscrowStatus::Completed;
        }

        Ok(())
    }

    pub fn refund_escrow(ctx: Context<RefundEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(
            ctx.accounts.client.key() == escrow.client,
            EscrowError::Unauthorized
        );

        require!(
            escrow.status != EscrowStatus::Completed,
            EscrowError::AlreadyCompleted
        );

        let remaining_amount = escrow.total_amount - escrow.paid_amount;

        if remaining_amount > 0 {
            let gig_id = escrow.gig_id.clone();
            let seeds = &[
                b"escrow",
                gig_id.as_bytes(),
                &[escrow.bump],
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

        escrow.status = EscrowStatus::Refunded;
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

    #[account(mut)]
    pub client_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
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

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
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

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub client_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
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
}
