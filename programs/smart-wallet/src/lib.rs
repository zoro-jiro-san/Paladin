use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use solana_program::system_instruction;

declare_id!("4nsD1dKtbA9CpxD5vyN2eVQX7LhvxEWdxPyQJ5r83Kf5");

#[program]
pub mod smart_wallet {
    use super::*;

    // Initialize a new SmartWallet
    pub fn initialize(
        ctx: Context<Initialize>,
        authority: Pubkey,
        daily_limit: u64,
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        wallet.authority = authority;
        wallet.vault = ctx.accounts.vault.key();
        wallet.daily_limit = daily_limit;
        wallet.spent_today = 0;
        wallet.last_reset = Clock::get()?.unix_timestamp;
        wallet.nonce = 0;
        wallet.bump = 0; // Will be set to proper PDA bump seed if needed
        wallet.plugins = Vec::new();
        
        Ok(())
    }

    // Register an agent
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_name: String,
        permissions: u64,
    ) -> Result<()> {
        let agent_registry = &mut ctx.accounts.agent_registry;
        
        let agent_metadata = AgentMetadata {
            pubkey: ctx.accounts.agent.key(),
            name: agent_name.clone(),
            owner: ctx.accounts.authority.key(),
            created_at: Clock::get()?.unix_timestamp,
            verified: false,
            reputation_score: 0,
            permissions,
        };
        
        agent_registry.agents.insert(
            ctx.accounts.agent.key(),
            agent_metadata,
        );
        
        Ok(())
    }

    // Transfer SOL from wallet
    pub fn transfer_sol(
        ctx: Context<TransferSol>,
        amount: u64,
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        let clock = Clock::get()?;
        
        // Reset daily limit if needed
        if clock.unix_timestamp - wallet.last_reset >= 86400 {
            wallet.spent_today = 0;
            wallet.last_reset = clock.unix_timestamp;
        }

        // Check daily limit
        require!(
            wallet.spent_today + amount <= wallet.daily_limit,
            SmartWalletError::DailyLimitExceeded
        );

        // Check authorization
        require_eq!(
            ctx.accounts.authority.key(),
            wallet.authority,
            SmartWalletError::Unauthorized
        );

        // Transfer SOL
        let ix = system_instruction::transfer(
            &ctx.accounts.vault.key(),
            &ctx.accounts.recipient.key(),
            amount,
        );
        
        solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.recipient.to_account_info(),
            ],
        )?;

        // Update state
        wallet.spent_today += amount;
        wallet.nonce += 1;

        emit!(TransferEvent {
            from: ctx.accounts.vault.key(),
            to: ctx.accounts.recipient.key(),
            amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // Deposit SOL to wallet
    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        amount: u64,
    ) -> Result<()> {
        let ix = system_instruction::transfer(
            &ctx.accounts.depositor.key(),
            &ctx.accounts.vault.key(),
            amount,
        );
        
        solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.depositor.to_account_info(),
                ctx.accounts.vault.to_account_info(),
            ],
        )?;

        emit!(DepositEvent {
            to: ctx.accounts.vault.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // Add a plugin to the wallet
    pub fn add_plugin(
        ctx: Context<AddPlugin>,
        plugin_type: PluginType,
        config: Vec<u8>,
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        
        require_eq!(
            ctx.accounts.authority.key(),
            wallet.authority,
            SmartWalletError::Unauthorized
        );

        let plugin = PluginConfig {
            plugin_type,
            config,
            enabled: true,
        };
        
        wallet.plugins.push(plugin);
        
        Ok(())
    }

    // Update wallet authority
    pub fn update_authority(
        ctx: Context<UpdateAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        
        require_eq!(
            ctx.accounts.authority.key(),
            wallet.authority,
            SmartWalletError::Unauthorized
        );

        wallet.authority = new_authority;
        
        Ok(())
    }

    // Update daily limit
    pub fn update_daily_limit(
        ctx: Context<UpdateDailyLimit>,
        new_limit: u64,
    ) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        
        require_eq!(
            ctx.accounts.authority.key(),
            wallet.authority,
            SmartWalletError::Unauthorized
        );

        wallet.daily_limit = new_limit;
        
        Ok(())
    }
}

// ==================== Accounts ====================

#[account]
pub struct SmartWallet {
    pub authority: Pubkey,
    pub vault: Pubkey,
    pub daily_limit: u64,
    pub spent_today: u64,
    pub last_reset: i64,
    pub nonce: u64,
    pub bump: u8,
    pub plugins: Vec<PluginConfig>,
}

#[account]
pub struct AgentRegistry {
    pub agents: std::collections::HashMap<Pubkey, AgentMetadata>,
}

#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct AgentMetadata {
    pub pubkey: Pubkey,
    pub name: String,
    pub owner: Pubkey,
    pub created_at: i64,
    pub verified: bool,
    pub reputation_score: u32,
    pub permissions: u64,
}

#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct PluginConfig {
    pub plugin_type: PluginType,
    pub config: Vec<u8>,
    pub enabled: bool,
}

#[derive(Clone, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub enum PluginType {
    DailyLimit,
    Whitelist,
    RateLimit,
    MultiSig,
    Custom,
}

// ==================== Contexts ====================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + 256)]
    pub wallet: Account<'info, SmartWallet>,
    #[account(mut)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub agent_registry: Account<'info, AgentRegistry>,
    pub agent: Signer<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferSol<'info> {
    #[account(mut)]
    pub wallet: Account<'info, SmartWallet>,
    #[account(mut)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddPlugin<'info> {
    #[account(mut)]
    pub wallet: Account<'info, SmartWallet>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAuthority<'info> {
    #[account(mut)]
    pub wallet: Account<'info, SmartWallet>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateDailyLimit<'info> {
    #[account(mut)]
    pub wallet: Account<'info, SmartWallet>,
    pub authority: Signer<'info>,
}

// ==================== Events ====================

#[event]
pub struct TransferEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct DepositEvent {
    pub to: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// ==================== Errors ====================

#[error_code]
pub enum SmartWalletError {
    #[msg("Daily limit exceeded")]
    DailyLimitExceeded,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Plugin validation failed")]
    PluginValidationFailed,
    
    #[msg("Insufficient balance")]
    InsufficientBalance,
}
