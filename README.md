# Merlin Backend

Backend service for the Merlin Starter airdrop platform. Manages multi-program token airdrops, wallet authentication, social media verification, community engagement tracking, and on-chain token claims on Merlin Chain.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Airdrop Programs](#airdrop-programs)
- [Blockchain Integration](#blockchain-integration)
- [Scheduled Jobs](#scheduled-jobs)
- [Utility Scripts](#utility-scripts)

## Features

- **Multi-Program Airdrops** - Supports Merlin Starter, Mineral, Merlin Swap, and Mage airdrop campaigns
- **Wallet Authentication** - EVM signature verification (Web3) and BTC message signature validation (Bitcore)
- **Social Media Verification** - Twitter OAuth binding, follow/retweet/like/quote tracking
- **Community Engagement** - Telegram group membership checks via bot, Discord server verification via OAuth
- **Referral System** - Invite code generation with bonus reward distribution
- **Token Vesting** - Time-locked token management with daily unlock schedules
- **Smart Contract Claims** - On-chain token distribution with claim record tracking
- **Session Management** - Redis-backed persistent sessions with CORS whitelisting

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js |
| Database | MySQL 2 (connection pooling) |
| Cache / Session Store | Redis 4.6 |
| Blockchain | Web3.js 4.5, Ethers.js 6.11, Bitcore-lib 10.0 |
| Social APIs | Twitter API v2, Discord.js 14, Telegram Bot API |
| Task Scheduling | node-cron, node-schedule |
| Data Processing | xlsx |

## Project Structure

```
merlin-be/
├── app.js                    # Legacy Express server with auth routes
├── web.js                    # Main airdrop API server (port 9000)
├── config.js                 # Credentials and environment configuration
├── db.js                     # MySQL connection pool
├── redisClient.js            # Redis client initialization
├── base_router.js            # Shared middleware and response helpers
│
├── service.js                # Merlin Starter core business logic
├── mineralservice.js         # Mineral airdrop service
├── merlinswapservice.js      # Merlin Swap airdrop service
├── mage_airdrop.js           # Mage airdrop Express router
├── mage_airdrop_service.js   # Mage airdrop business logic
│
├── telegram.js               # Telegram group membership verification
├── bot.js                    # Telegram bot command handler
├── discordService.js         # Discord OAuth and server verification
│
├── twitterClient.js          # Twitter API v2 client setup
├── fetchtweets.js            # Tweet fetching and caching
├── fetchfollowers.js         # Follower synchronization
│
├── sbt/
│   ├── mstartairdrop.js      # Token claim and unlock logic
│   └── airdropjob.js         # Cron jobs for claims and unlocks
│
├── staking/
│   └── handleStakingLong.js  # Staking contract monitoring
│
├── tool/                     # Admin utility scripts
│   ├── AddMineralWhiteList.js
│   ├── addstarts.js
│   ├── setwinner.js
│   └── add2mysql.js
│
├── draw.js                   # Lottery / draw logic
├── getBalance.js             # On-chain balance query utility
├── package.json
└── README.md
```

## Prerequisites

- **Node.js** >= 18.x
- **MySQL** 5.7+ or 8.x
- **Redis** 6.x+
- Access to **Merlin Chain RPC** (`https://rpc.merlinchain.io`)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd merlin-be

# Install dependencies
npm install
```

## Configuration

All configuration is centralized in `config.js`. Key settings include:

| Setting | Description |
|---|---|
| `twitterConfig` | Twitter API v2 credentials (API key, secret, access tokens) |
| `dbConfig` | MySQL connection (host, port, user, password, database) |
| `claimConfig` | Merlin Chain RPC URL, contract address, reward token address |
| Redis | Defaults to `localhost:6379` (configured in `redisClient.js`) |
| Session | Domain: `merlinstarter.com`, secret: configurable, max age: 1 hour |

### CORS Allowed Origins

- `https://merlinstarter.com`
- `https://www.merlinstarter.com`
- `https://preview.merlinstarter.com`
- `https://airdrop.merlinstarter.com`
- `https://predrop.merlinstarter.com`

## Running

```bash
# Start the main airdrop API server
node web.js

# Start the Telegram bot (separate process)
node bot.js

# Start scheduled airdrop jobs (separate process)
node sbt/airdropjob.js

# Start tweet fetching (separate process)
node fetchtweets.js

# Start follower sync (separate process)
node fetchfollowers.js
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/wallet_register` | Register wallet with EVM signature |
| `POST` | `/btc_login` | Authenticate via BTC message signature |
| `GET` | `/logout` | Destroy session |

### Twitter OAuth

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/oauthUrl` | Generate Twitter OAuth authorization URL |
| `GET` | `/callback` | Handle Twitter OAuth callback |

### Merlin Starter

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/check_wallet` | Validate wallet eligibility and initiate steps |
| `GET` | `/info` | Get user progress, points, and airdrop balance |
| `GET` | `/bind` | Link Twitter account to wallet |
| `GET` | `/follow` | Verify Twitter follow completion |
| `GET` | `/share` | Verify tweet share completion |
| `GET` | `/share_like` | Verify retweet/like/quote and award points |
| `GET` | `/connect_telegram` | Verify Telegram group membership |
| `GET` | `/get_code` | Generate invite code |
| `GET` | `/claim_stars` | Claim accumulated star points |

### Mineral Airdrop

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/mineral_check_wallet` | Check wallet eligibility (>0.01 BTC or >100 VOYA) |
| `GET` | `/mineral_info` | Get Mineral airdrop status |
| `GET` | `/mineral_bind` | Bind Twitter account |
| `GET` | `/follow_merlin_twitter` | Verify Merlin Twitter follow |
| `GET` | `/follow_mineral_twitter` | Verify Mineral Twitter follow |

### Merlin Swap Airdrop

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/swap_check_wallet` | Check eligibility (requires 500+ Starter points) |
| `GET` | `/swap_info` | Get Swap airdrop status |
| `GET` | `/swap_bind` | Bind Twitter account |
| `GET` | `/swap_follow_merlin_twitter` | Verify Merlin Twitter follow |
| `GET` | `/swap_follow_swap_twitter` | Verify Swap Twitter follow |
| `GET` | `/swap_check_tg_group` | Verify Telegram group membership |
| `GET` | `/swap_check_dc_group` | Verify Discord server membership |
| `GET` | `/swap_post_tweet` | Complete tweet posting step |

### Mage Airdrop (prefix: `/mage`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/mage_check_wallet` | Check eligibility (>0.00001 BTC or whitelist) |
| `GET` | `/mage_info` | Get Mage airdrop status |
| `GET` | `/mage_bind` | Bind Twitter account |
| `GET` | `/mage_follow_merlin_twitter` | Verify Merlin Twitter follow |
| `GET` | `/mage_follow_mage_twitter` | Verify Mage Twitter follow |
| `GET` | `/mage_check_join_merlin_tg_group` | Verify Merlin Telegram membership |
| `GET` | `/mage_check_join_mage_tg_group` | Verify Mage Telegram membership |
| `GET` | `/mage_check_dc_group` | Verify Discord server membership |
| `GET` | `/mage_post_tweet` | Complete tweet posting step |

### Discord & Telegram

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/get_discord_oauth_url` | Get Discord OAuth authorization URL |
| `GET` | `/discord_callback` | Handle Discord OAuth callback |
| `GET` | `/verify_discord_join` | Verify Discord server membership |
| `GET` | `/get_tg_bot_url` | Get Telegram bot URL with invite code |
| `GET` | `/check_merlin_tg_group` | Check Merlin Telegram group membership |
| `GET` | `/check_mineral_tg_group` | Check Mineral Telegram group membership |

### Token Claims

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/claim_mstart` | Get claim signature and create claim record |
| `GET` | `/nft_ab_check` | Get A/B test assignment for NFT |

## Airdrop Programs

### User Step Progression

Each airdrop program follows a step-based progression model. Users must complete each step sequentially:

#### Merlin Starter (5 steps)
1. **Wallet Check** - Register wallet and verify balance (>=0.0001 BTC) or staking record
2. **Twitter Bind** - Connect Twitter account via OAuth
3. **Follow** - Follow Merlin Starter on Twitter
4. **Share** - Share a designated tweet
5. **Telegram** - Join the Merlin Telegram group
6. **Claim** - Claim star points (base: 100 stars)

#### Mineral / Swap / Mage (6-7 steps)
Similar progression with additional social channel requirements (multiple Twitter follows, Telegram groups, Discord server verification).

### Referral System

- Users generate unique invite codes via `/get_code`
- New users can attach an inviter code during wallet check
- When the invitee claims stars, the inviter receives **800 bonus stars**

### Eligibility Requirements

| Program | Minimum Balance | Additional |
|---|---|---|
| Merlin Starter | 0.0001 BTC or staking record | - |
| Mineral | 0.01 BTC or 100 VOYA tokens | Whitelist support |
| Merlin Swap | 0.01 BTC or 100 VOYA tokens | Requires 500+ Starter points |
| Mage | 0.00001 BTC | Whitelist support |

## Blockchain Integration

### Merlin Chain

- **RPC**: `https://rpc.merlinchain.io`
- **Airdrop Contract**: `0xB6608DB27857346A3bd6cf38E950112BAd0feB7A`
- **Reward Token (MSTART)**: `0x09401c470a76Ec07512EEDDEF5477BE74bac2338`
- **VOYA Token**: `0x480E158395cC5b41e5584347c495584cA2cAf78d`

### Token Claim Flow

1. User requests claim via `/claim_mstart`
2. Backend transfers balance from `wallet_claim_balance` to `freeze`
3. Claim record is created with nonce and expiry
4. User submits on-chain transaction using the claim record
5. Cron job confirms on-chain claim and updates `freeze` -> `claimed`

### Token Vesting

- Airdrop tokens are allocated with a vesting schedule in `wallet_lock_balance`
- Daily unlock job releases tokens based on `remain_days`
- Unlocked tokens move to `wallet_claim_balance` for user claiming

## Scheduled Jobs

Defined in `sbt/airdropjob.js`:

| Schedule | Job | Description |
|---|---|---|
| Every minute | `confirmClaimResult()` | Verify on-chain claim completions |
| Daily 19:30 (Asia/Shanghai) | `unlockToken()` | Release next batch of vested tokens |

## Database Schema

### Core Tables

| Table | Purpose |
|---|---|
| `users` | Merlin Starter participants (wallet, twitter, stars, steps, invite code) |
| `mineral_users` | Mineral airdrop participants |
| `merlin_swap_users` | Merlin Swap airdrop participants |
| `mage_users` | Mage airdrop participants |
| `user_tg_discord` | Telegram and Discord account bindings |
| `tweets` | Cached Twitter posts |
| `twitter_follows` | Twitter follower tracking |
| `pledge_data` | On-chain staking records |
| `wallet_lock_balance` | Token vesting schedules |
| `wallet_claim_balance` | Claimable token balances |
| `wallet_claim_record` | Claim transaction audit trail |
| `wallet_unlock_record` | Token unlock audit trail |

## Utility Scripts

Located in `tool/`:

| Script | Purpose |
|---|---|
| `AddMineralWhiteList.js` | Import addresses into Mineral whitelist (Redis set) |
| `addstarts.js` | Bulk assign starting star points from XLSX |
| `setwinner.js` | Manage lottery/draw winners |
| `add2mysql.js` | Import data from XLSX files into MySQL |

## API Response Format

All endpoints return a unified JSON response:

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Business logic error (see message) |
| `401` | Unauthorized (session expired or missing) |

## License

ISC
