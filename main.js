const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors/safe");
const readline = require("readline");
const { performance } = require("perf_hooks");
const winston = require("winston");

// Create a custom logger using Winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      let coloredLevel;
      switch (level) {
        case "info":
          coloredLevel = colors.blue(level.toUpperCase());
          break;
        case "warn":
          coloredLevel = colors.yellow(level.toUpperCase());
          break;
        case "error":
          coloredLevel = colors.red(level.toUpperCase());
          break;
        default:
          coloredLevel = level.toUpperCase();
      }
      return `${timestamp} | ${coloredLevel} | ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

class Babydoge {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://babydogepawsbot.com",
      Referer: "https://babydogepawsbot.com/",
      "Sec-Ch-Ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    };
    this.line = colors.white("-".repeat(42));
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
        if (typeof res.data !== "object") {
          logger.error("Did not receive a valid JSON response!");
          attempts++;
          await this.sleep(2000);
          continue;
        }
        return res;
      } catch (error) {
        attempts++;
        logger.error(
          `Connection error (Attempt ${attempts}/${maxAttempts}): ${error.message}`
        );

        if (attempts < maxAttempts) {
          await this.sleep(5000);
        } else {
          break;
        }
      }
    }
    throw new Error("Unable to connect after 3 attempts");
  }

  async login(tgData) {
    const url = "https://backend.babydogepawsbot.com/authorize";
    const headers = { ...this.headers };
    try {
      const res = await this.http(url, headers, tgData);
      if (res.data) {
        logger.info("Login successful!");
        const { balance, energy, max_energy, access_token, league } = res.data;
        const points_per_tap = league.points_per_tap;
        logger.info(`Balance: ${balance}`);
        logger.info(`Energy: ${energy}/${max_energy}`);
        logger.info(`Points per tap: ${points_per_tap}`);
        return { access_token, energy, points_per_tap };
      } else {
        logger.error("Login failed!");
        return null;
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`);
      return null;
    }
  }

  async daily(access_token) {
    const checkUrl = "https://backend.babydogepawsbot.com/getDailyBonuses";
    const claimUrl = "https://backend.babydogepawsbot.com/pickDailyBonus";
    const headers = { ...this.headers, "X-Api-Key": access_token };

    try {
      const checkRes = await this.http(checkUrl, headers);
      if (checkRes.data && checkRes.data.has_available) {
        logger.info("Daily check-in available!");
        const claimRes = await this.http(claimUrl, headers, "");
        if (claimRes.data) {
          logger.info("Daily check-in successful!");
        } else {
          logger.error("Daily check-in failed!");
        }
      } else {
        logger.info("Daily check-in already claimed today.");
      }
    } catch (error) {
      logger.error(
        `Error when checking or claiming daily bonus: ${error.message}`
      );
    }
  }

  async getTask(access_token) {
    const url = "https://backend.babydogepawsbot.com/channels";
    const headers = { ...this.headers, "X-Api-Key": access_token };

    try {
      const res = await this.http(url, headers);
      if (res && res.data && res.data.channels) {
        const availableChannels = res.data.channels.filter(
          (channel) => channel.is_available && channel.type !== "telegram"
        );
        return availableChannels;
      } else {
        logger.info("No tasks available.");
        return [];
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`);
      return [];
    }
  }

  async claimTask(access_token, channel) {
    const url = "https://backend.babydogepawsbot.com/channels";
    const headers = {
      ...this.headers,
      "X-Api-Key": access_token,
      "Content-Type": "application/json",
    };
    const data = JSON.stringify({ channel_id: channel.id });

    try {
      const res = await this.http(url, headers, data);
      if (res && res.data) {
        logger.info(`Completing task: ${channel.title} | Status: successful`);
      } else {
        logger.error(`Error when claiming reward for task: ${channel.title}`);
      }
    } catch (error) {
      logger.error(`Error when claiming reward: ${error.message}`);
    }
  }

  async tap(access_token, initialEnergy, points_per_tap) {
    const url = "https://backend.babydogepawsbot.com/mine";
    const headers = {
      ...this.headers,
      "X-Api-Key": access_token,
      "Content-Type": "application/json",
    };
    let energy = initialEnergy;

    try {
      while (energy >= 50) {
        const randomEnergy = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
        let count = Math.floor((energy - randomEnergy) / points_per_tap);

        if (count <= 0) {
          logger.info(
            "Not enough energy to continue tapping switching account!"
          );
          break;
        }

        const data = JSON.stringify({ count });

        const res = await this.http(url, headers, data);
        if (res.data) {
          const {
            balance,
            mined,
            newEnergy,
            league,
            current_league,
            next_league,
          } = res.data.mine;

          logger.info(
            `Tapped ${mined} times | Balance: ${balance} | Energy: ${newEnergy}`
          );

          energy = newEnergy;

          if (energy < 50) {
            logger.info(
              "Energy too low to continue tapping switching account!"
            );
            break;
          }
        } else {
          logger.error("Error, unable to tap!");
          break;
        }
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`);
    }
  }

  async buyCards(access_token) {
    const listCardsUrl = "https://backend.babydogepawsbot.com/cards";
    const upgradeUrl = "https://backend.babydogepawsbot.com/cards";
    const getMeUrl = "https://backend.babydogepawsbot.com/getMe";
    const headers = {
      ...this.headers,
      "X-Api-Key": access_token,
      "Content-Type": "application/json",
    };

    try {
      const getMeRes = await this.http(getMeUrl, headers);
      let balance = getMeRes.data.balance;

      const res = await this.http(listCardsUrl, headers);
      if (res.data && res.data.length > 0) {
        for (const category of res.data) {
          for (const card of category.cards) {
            if (balance < card.upgrade_cost) {
              logger.error("Insufficient balance to buy card!");
              return;
            }

            if (card.cur_level === 0 && card.is_available) {
              const upgradeData = JSON.stringify({ id: card.id });
              const upgradeRes = await this.http(
                upgradeUrl,
                headers,
                upgradeData
              );
              if (upgradeRes.data) {
                balance = upgradeRes.data.balance;
                logger.info(
                  `Buying card ${card.name} | Status: Successful | New Balance: ${balance}`
                );
              } else {
                logger.error(`Buying card ${card.name} | Status: Failed`);
              }
            }
          }
        }
      } else {
        logger.info("No new cards available.");
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`);
    }
  }

  async upgradeMyCards(access_token) {
    const listCardsUrl = "https://backend.babydogepawsbot.com/cards";
    const upgradeUrl = "https://backend.babydogepawsbot.com/cards";
    const getMeUrl = "https://backend.babydogepawsbot.com/getMe";
    const headers = {
      ...this.headers,
      "X-Api-Key": access_token,
      "Content-Type": "application/json",
    };

    try {
      const getMeRes = await this.http(getMeUrl, headers);
      let balance = getMeRes.data.balance;

      const res = await this.http(listCardsUrl, headers);
      if (res.data && res.data.length > 0) {
        while (true) {
          let upgraded = false;
          for (const category of res.data) {
            for (const card of category.cards) {
              if (balance < card.upgrade_cost) {
                logger.error("Insufficient balance to upgrade card!");
                return;
              }

              if (balance >= card.upgrade_cost && card.is_available) {
                const upgradeData = JSON.stringify({ id: card.id });
                const upgradeRes = await this.http(
                  upgradeUrl,
                  headers,
                  upgradeData
                );
                if (upgradeRes.data) {
                  balance = upgradeRes.data.balance;
                  logger.info(
                    `Upgrading card ${card.name} Status: Successful | New Balance: ${balance}`
                  );
                  upgraded = true;
                } else {
                  logger.error(`Upgrading card ${card.name} | Status: Failed`);
                }
              }
            }
          }
          if (!upgraded) break;
        }
      } else {
        logger.info("No cards need upgrading.");
      }
    } catch (error) {
      logger.error(`Error when upgrading card: ${error.message}`);
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  askQuestion(query) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) =>
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
      })
    );
  }

  async waitWithCountdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        colors.cyan(
          `Completed all accounts, waiting ${i} seconds to continue the loop`
        )
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("");
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    if (data.length <= 0) {
      logger.error("No accounts added!");
      process.exit();
    }
    console.log(this.line);

    const buyCards = await this.askQuestion(
      colors.cyan("Do you want to buy new cards? (y/n): ")
    );
    const buyCardsDecision = buyCards.toLowerCase() === "y";

    const upgradeMyCards = await this.askQuestion(
      colors.cyan("Do you want to upgrade cards? (y/n): ")
    );
    const upgradeMyCardsDecision = upgradeMyCards.toLowerCase() === "y";

    while (true) {
      const start = performance.now();

      for (const [index, tgData] of data.entries()) {
        const userData = JSON.parse(
          decodeURIComponent(tgData.split("&")[1].split("=")[1])
        );
        const firstName = userData.first_name;
        logger.info(`Account ${index + 1}/${data.length} | ${firstName}`);

        const loginData = await this.login(tgData);
        if (!loginData) {
          logger.error("Login failed, moving to the next account.");
          continue;
        }

        const { balance, access_token, energy, points_per_tap } = loginData;

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

          await this.tap(access_token, energy, points_per_tap);
        }

        await this.sleep(5000);
      }

      await this.waitWithCountdown(60);
    }
  }
}
if (require.main === module) {
  process.on("SIGINT", () => {
    console.log(
      colors.yellow("\nGracefully shutting down from SIGINT (Ctrl+C)")
    );
    process.exit();
  });

  new Babydoge().main().catch((error) => {
    logger.error(`Unhandled error in main execution: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  });
}
