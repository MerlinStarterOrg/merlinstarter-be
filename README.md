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

