const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { performance } = require('perf_hooks');

class Pocketfi {
    constructor() {
        this.headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://babydogepawsbot.com',
            'Referer': 'https://babydogepawsbot.com/',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?1',
            'Sec-Ch-Ua-Platform': '"Android"',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        };                
        this.line = '~'.repeat(42).white;
    }

    async http(url, headers, data = null) {
        let attempts = 0;
        const maxAttempts = 3;
    
        while (attempts < maxAttempts) {
            try {
                let res;
                if (data === null) {
                    res = await axios.get(url, { headers });
                } else {
                    res = await axios.post(url, data, { headers });
                }
                if (typeof res.data !== 'object') {
                    this.log('No valid JSON response received!'.red);
                    attempts++;
                    await this.sleep(2000);
                    continue;
                }
                return res;
            } catch (error) {
                attempts++;
                this.log(`Connection error (Attempt ${attempts}/${maxAttempts}): ${error.message}`.red);
                if (attempts < maxAttempts) {
                    await this.sleep(5000);
                } else {
                    break;
                }
            }
        }
        throw new Error('Unable to connect after 3 attempts');
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async dangnhap(tgData) {
        const url = 'https://backend.babydogepawsbot.com/authorize';
        const headers = { ...this.headers };
        try {
            const res = await this.http(url, headers, tgData);
            if (res.data) {
                this.log('Logged in successfully!'.green);
                const { balance, energy, max_energy, access_token } = res.data;
                this.log('Balance:'.green + ` ${balance}`);
                this.log('Energy:'.green + ` ${energy}/${max_energy}`);
                return { access_token, energy };
            } else {
                this.log('Login failed!'.red);
                return null;
            }
        } catch (error) {
            this.log(`It's a mistake: ${error.message}`.red);
            return null;
        }
    }

    async daily(access_token) {
        const checkUrl = 'https://backend.babydogepawsbot.com/getDailyBonuses';
        const claimUrl = 'https://backend.babydogepawsbot.com/pickDailyBonus';
        const headers = { ...this.headers, 'X-Api-Key': access_token };

        try {
            const checkRes = await this.http(checkUrl, headers);
            if (checkRes.data && checkRes.data.has_available) {
                this.log('Daily attendance available!'.yellow);
                const claimRes = await this.http(claimUrl, headers, '');
                if (claimRes.data) {
                    this.log('Successful daily attendance!'.green);
                } else {
                    this.log('Daily attendance failed!'.red);
                }
            } else {
                this.log('Today, daily attendance was taken.'.yellow);
            }
        } catch (error) {
            this.log(`Error when checking or claiming daily bonus: ${error.message}`.red);
        }
    }

    async getTask(access_token) {
        const url = 'https://backend.babydogepawsbot.com/channels';
        const headers = { ...this.headers, 'X-Api-Key': access_token };
    
        try {
            const res = await this.http(url, headers);
            if (res && res.data && res.data.channels) {
                const availableChannels = res.data.channels.filter(channel => channel.is_available && channel.type !== 'telegram');
                return availableChannels;
            } else {
                this.log('There are no missions available.'.yellow);
                return [];
            }
        } catch (error) {
            this.log(`Error: ${error.message}`.red);
            return [];
        }
    }
    
    async claimTask(access_token, channel) {
        const url = 'https://backend.babydogepawsbot.com/channels';
        const headers = { ...this.headers, 'X-Api-Key': access_token, 'Content-Type': 'application/json' };
        const data = JSON.stringify({ channel_id: channel.id });
    
        try {
            const res = await this.http(url, headers, data);
            if (res && res.data) {
                this.log(`On duty: ${channel.title.yellow}... Status: successful`);
            } else {
                this.log(`Error when receiving reward for quest: ${channel.title}`.red);
            }
        } catch (error) {
            this.log(`Error when receiving rewards: ${error.message}`.red);
        }
    }

    async tapdc(access_token, initialEnergy) {
        const url = 'https://backend.babydogepawsbot.com/mine';
        const headers = { ...this.headers, 'X-Api-Key': access_token, 'Content-Type': 'application/json' };
        let energy = initialEnergy;
        try {
            while (energy >= 50) {
                const count = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
                const data = JSON.stringify({ count });

                const res = await this.http(url, headers, data);
                if (res.data) {
                    const { balance, mined, newEnergy, league, current_league, next_league } = res.data;

                    this.log(`Taped ${String(mined).yellow} time. Balance: ${String(balance).yellow} Energy: ${String(newEnergy).yellow}`);

                    energy = newEnergy;
                    await this.sleep(Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000);
                    if (energy < 30) {
                        this.log('Energy is too low to continue tapping...switch account!'.yellow);
                        break;
                    }
                } else {
                    this.log('Error, impossible tap!'.red);
                    break;
                }
            }
        } catch (error) {
            this.log(`It's a mistake: ${error.message}`.red);
        }
    }

    async buyCards(access_token) {
        const listCardsUrl = 'https://backend.babydogepawsbot.com/cards/new';
        const upgradeUrl = 'https://backend.babydogepawsbot.com/cards';
        const getMeUrl = 'https://backend.babydogepawsbot.com/getMe';
        const headers = { ...this.headers, 'X-Api-Key': access_token, 'Content-Type': 'application/json' };
    
        try {
            const getMeRes = await this.http(getMeUrl, headers);
            let balance = getMeRes.data.balance;
    
            const res = await this.http(listCardsUrl, headers);
            if (res.data && res.data.length > 0) {
                const cards = res.data;
                for (const card of cards) {
                    if (balance < card.upgrade_cost) {
                        this.log(`The balance is not enough to purchase the card!`.red);
                        return;
                    }
    
                    if (card.cur_level === 0) {
                        const upgradeData = JSON.stringify({ id: card.id });
                        const upgradeRes = await this.http(upgradeUrl, headers, upgradeData);
                        if (upgradeRes.data) {
                            balance = upgradeRes.data.balance;
                            this.log(`Buying card ${card.name.yellow}...Status: ${'Success'.green} Balance new: ${String(balance).yellow}`);
                        } else {
                            this.log(`Buying card ${card.name.yellow}...Status: ${'Failure'.red}`);
                        }
                    }
                }
            } else {
                this.log('There are no new cards.'.yellow);
            }
        } catch (error) {
            this.log(`It's a mistake: ${error.message}`.red);
        }
    }    

    async upgradeMyCards(access_token) {
        const listMyCardsUrl = 'https://backend.babydogepawsbot.com/cards/my';
        const upgradeUrl = 'https://backend.babydogepawsbot.com/cards';
        const getMeUrl = 'https://backend.babydogepawsbot.com/getMe';
        const headers = { ...this.headers, 'X-Api-Key': access_token, 'Content-Type': 'application/json' };
    
        try {
            const getMeRes = await this.http(getMeUrl, headers);
            let balance = getMeRes.data.balance;
    
            const res = await this.http(listMyCardsUrl, headers);
            if (res.data && res.data.length > 0) {
                let cards = res.data;
                while (true) {
                    let upgraded = false;
                    for (const card of cards) {
                        if (balance < card.upgrade_cost) {
                            this.log(`Insufficient balance to upgrade card!`.red);
                            return;
                        }
    
                        if (balance >= card.upgrade_cost) {
                            const upgradeData = JSON.stringify({ id: card.id });
                            const upgradeRes = await this.http(upgradeUrl, headers, upgradeData);
                            if (upgradeRes.data) {
                                balance = upgradeRes.data.balance;
                                cards = upgradeRes.data.my_cards;
                                this.log(`Upgrading card ${card.name.yellow}...Status: ${'Success'.green} Balance new: ${String(balance).yellow}`);
                                upgraded = true;
                            } else {
                                this.log(`Upgrading card ${card.name.yellow}...Status: ${'Failure'.red}`);
                            }
                        }
                    }
                    if (!upgraded) break;
                }
            } else {
                this.log('No cards need upgrading.'.yellow);
            }
        } catch (error) {
            this.log(`Error when upgrading card: ${error.message}`.red);
        }
    }     
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }))
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== All accounts completed, waiting ${i} seconds to continue the loop =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
    
        if (data.length <= 0) {
            this.log('No accounts added!'.red);
            process.exit();
        }
    
        this.log('BabyDogePAWS Bot'.green);
        console.log(this.line);
    
        const buyCards = await this.askQuestion('Do you want to buy a new card? (y/n):');
        const buyCardsDecision = buyCards.toLowerCase() === 'y';
    
        const upgradeMyCards = await this.askQuestion('Do you want to upgrade your card? (y/n): ');
        const upgradeMyCardsDecision = upgradeMyCards.toLowerCase() === 'y';
    
        while (true) {
            const start = performance.now();
    
            for (const [index, tgData] of data.entries()) {
                const userData = JSON.parse(decodeURIComponent(tgData.split('&')[1].split('=')[1]));
                const firstName = userData.first_name;
                console.log(`========== Account ${index + 1}/${data.length} | ${firstName.green} ==========`);
    
                const { balance, access_token, energy } = await this.dangnhap(tgData);
                if (access_token) {
                    await this.daily(access_token);
    
                    const availableChannels = await this.getTask(access_token);
                    for (const channel of availableChannels) {
                        await this.claimTask(access_token, channel);
                    }
    
                    if (buyCardsDecision) {
                        await this.buyCards(access_token, balance);
                    }
    
                    if (upgradeMyCardsDecision) {
                        await this.upgradeMyCards(access_token, balance);
                    }
                    
                    await this.tapdc(access_token, energy);
                }
    
                await this.sleep(5000);
            }
    
            await this.waitWithCountdown(60);
        }
    }
}   
 
if (require.main === module) {
    process.on('SIGINT', () => {
        process.exit();
    });
    (new Pocketfi()).main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}    