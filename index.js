import fs from 'fs';
import axios from 'axios';
import { URL } from 'url';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import chalk from 'chalk';
import displayBanner from './banner.js';

class NodeGoPinger {
    constructor(token, proxyUrl = null) {
        this.apiBaseUrl = 'https://nodego.ai/api';
        this.bearerToken = token;
        this.agent = proxyUrl ? this.createProxyAgent(proxyUrl) : null;
        this.lastPingTimestamp = 0;
        this.ip = this.getIp();
    }

    async getIp() {
        const response = await axios.get('http://httpbin.org/ip', { httpAgent: this.agent });
        this.ip = response.data?.origin;
    }

    createProxyAgent(proxyUrl) {
        try {
            const parsedUrl = new URL(proxyUrl);
            
            // Handle different proxy protocols
            if (proxyUrl.startsWith('socks')) {
                return new SocksProxyAgent(parsedUrl);
            } else if (proxyUrl.startsWith('http')) {
                // Use appropriate agent for HTTP/HTTPS
                return {
                    httpAgent: new HttpProxyAgent(parsedUrl),
                    httpsAgent: new HttpsProxyAgent(parsedUrl)
                };
            } else {
                // Default to HTTP if no protocol specified
                const httpUrl = `http://${proxyUrl}`;
                const httpParsedUrl = new URL(httpUrl);
                return {
                    httpAgent: new HttpProxyAgent(httpParsedUrl),
                    httpsAgent: new HttpsProxyAgent(httpParsedUrl)
                };
            }
        } catch (error) {
            console.error(chalk.red('Invalid proxy URL:'), error.message, proxyUrl);
            return null;
        }
    }

    async getUserInfo() {
        try {
            const response = await this.makeRequest('GET', '/user/me');
            const metadata = response.data.metadata;
            return {
                username: metadata.username,
                email: metadata.email,
                totalPoint: metadata.rewardPoint,
                nodes: metadata.nodes.map(node => ({
                    id: node.id,
                    totalPoint: node.totalPoint,
                    todayPoint: node.todayPoint,
                    isActive: node.isActive
                }))
            };
        } catch (error) {
            console.error(chalk.red('Failed to fetch user info:'), error.message);
            throw error; // Propagate error for better handling
        }
    }

    async makeRequest(method, endpoint, data = null) {
        const config = {
            method,
            url: `${this.apiBaseUrl}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${this.bearerToken}`,
                'Content-Type': 'application/json',
                'Accept': '*/*'
            },
            ...(data && { data }),
            timeout: 30000 // 30 second timeout
        };

        // Apply proxy agents if configured
        if (this.agent) {
            if (this.agent.httpAgent) {
                // For HTTP/HTTPS proxies
                config.httpAgent = this.agent.httpAgent;
                config.httpsAgent = this.agent.httpsAgent;
            } else {
                // For SOCKS proxies
                config.httpAgent = this.agent;
                config.httpsAgent = this.agent;
            }
        }

        try {
            return await axios(config);
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                throw new Error(`Proxy connection failed: ${error.message}`);
            }
            throw error;
        }
    }

    async ping() {
        try {
            const currentTime = Date.now();
            
            // Ensure at least a 3-second gap between pings
            if (currentTime - this.lastPingTimestamp < 3000) {
                await new Promise(resolve => setTimeout(resolve, 3000 - (currentTime - this.lastPingTimestamp)));
            }

            const response = await this.makeRequest('POST', '/user/nodes/ping', { type: 'extension' });
            
            this.lastPingTimestamp = Date.now();
            
            return {
                statusCode: response.data.statusCode,
                message: response.data.message,
                metadataId: response.data.metadata.id
            };
        } catch (error) {
            console.error(chalk.red(`Ping failed: ${error.message}`));
            throw error;
        }
    }
}

class MultiAccountPinger {
    constructor() {
        this.accounts = this.loadAccounts();
        this.isRunning = true;
    }

    loadAccounts() {
        try {
            const accountData = fs.readFileSync('data.txt', 'utf8')
                .split('\n')
                .filter(line => line.trim());
            
            const proxyConfig = fs.existsSync('proxy.json')
                ? JSON.parse(fs.readFileSync('proxy.json', 'utf8'))
                : [];
            
            return accountData.map((token, index) => ({
                token: token.trim(),
                proxies: proxyConfig[index] ? proxyConfig[index] : []
            }));
        } catch (error) {
            console.error(chalk.red('Error reading accounts:'), error);
            process.exit(1);
        }
    }

    async processSingleAccount(account) {
        console.log(chalk.white('='.repeat(50)));
        console.log(chalk.cyan(`Processing account with ${account.proxies.length} proxies`));
        for (const proxy of account.proxies) {
            const pinger = new NodeGoPinger(account.token, proxy);
            try {
                const userInfo = await pinger.getUserInfo();
                if (!userInfo) continue;
                console.log(chalk.cyan(`\nProxy: ${proxy}`));
                console.log(chalk.yellow(`Email: ${userInfo.email}`));
                console.log(chalk.yellow(`Nodes Length: ${userInfo.nodes?.length}`));
                console.log(chalk.green(`\nTotal Points: ${userInfo.totalPoint}`));
                console.log(chalk.yellow(`Start Ping Ip: ${pinger.ip}`));
                const pingResponse = await pinger.ping();
                console.log(chalk.green(`Status Code: ${pingResponse.statusCode}`));
                console.log(chalk.green(`Ping Message: ${pingResponse.message}`));
                console.log(chalk.white(`Metadata ID: ${pingResponse.metadataId}`));
                
            } catch (error) {
                console.error(chalk.red(`Error with proxy ${proxy}: ${error.message}`));
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        console.log(chalk.white('='.repeat(50)));
    }

    async runPinger() {
        displayBanner();
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\nGracefully shutting down...'));
            this.isRunning = false;
            setTimeout(() => process.exit(0), 1000);
        });

        while (this.isRunning) {
            console.log(chalk.white(`\n⏰ Ping Cycle at ${new Date().toLocaleString()}`));
            
            for (const account of this.accounts) {
                if (!this.isRunning) break;
                await this.processSingleAccount(account);
            }

            if (this.isRunning) {
                await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
            }
        }
    }
}

// Run the multi-account pinger
const multiPinger = new MultiAccountPinger();
multiPinger.runPinger();
