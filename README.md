# NodeGo Auto Bot

Automated bot for NodeGo platform with support for multiple accounts and proxy configurations (HTTP/SOCKS).

## Features

- Multi-account support
- HTTP and SOCKS proxy support
- Automatic periodic pinging
- Detailed logging with colored output
- Account status monitoring
- Graceful shutdown handling

## Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/airdropinsiders/NodeGo-Auto-Bot.git
cd NodeGo-Auto-Bot
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create `data.txt` in the project root:
   - Add one NodeGo token per line
   - Example:
     ```
     token1
     token2
     token3
     ```

2. (Optional) Create `proxy.json` in the project root:
   - Add one proxy per line
   - Supports both HTTP and SOCKS proxies
   - Example:
     ```
     [
      [
         'proxy1',
         'proxy2',
         ...
      ]
     ]
     ```

## Usage

Run the bot:
```bash
node index.js
```

The bot will:
- Load all accounts from data.txt
- Associate proxies from proxy.json if available
- Start periodic pinging every 15 seconds
- Display detailed status information for each account

## Output Information

For each account, the bot displays:
- Username
- Email
- Node information
  - Node ID
  - Total Points
  - Today's Points
  - Active Status
- Total Account Points
- Ping Status and Response

## Troubleshooting

Common issues and solutions:

1. Proxy Connection Errors:
   - Verify proxy format is correct
   - Check if proxy is online and accessible
   - Ensure proxy supports HTTPS connections

2. Authentication Errors:
   - Verify token is valid and not expired
   - Check if token has proper permissions

3. Rate Limiting:
   - The bot automatically handles rate limiting with 3-second delays between pings
   - If you encounter rate limits, consider increasing the delay

## Contributing

Feel free to fork the repository and submit pull requests for any improvements.

## License

MIT License

## Disclaimer

This bot is for educational purposes only. Use at your own risk and ensure compliance with NodeGo's terms of service.
