# BabyDoge BOT 🐶

Automate your BabyDoge PAWs Bot experience with this powerful Node.js bot!

## 🌟 Features

- ✅ Auto tap for mining
- 📅 Automatic daily check-in
- 🎴 Auto card raising/upgrading
- 🛒 Automatic card purchasing
- 👥 Support for multiple accounts

## 🛠 Prerequisites

Before you begin, ensure you have met the following requirements:

- [Node.js](https://nodejs.org/) (v14 or higher) installed on your machine
- A BabyDoge account - [Register here via Telegram](https://t.me/BabyDogePAWS_Bot?start=r_6944804952)
  - Click on the link above to open the BabyDoge PAWS Bot in Telegram
  - Start the bot and follow the registration process in Telegram
- Basic knowledge of using command line interfaces

## 🚀 Setup & Configuration

Follow these steps to get your BabyDoge BOT up and running:

1. **Clone the repository**

   ```
   git clone https://github.com/Galkurta/BabyDoge-BOT.git
   cd BabyDoge-BOT
   ```

2. **Install dependencies**

   ```
   npm install
   ```

3. **Configure your accounts**

   - Open BabyDoge on Telegram Web
   - Navigate to the application menu
   - Go to session storage and copy the `query_id`
   - Paste the `query_id` into the `data.txt` file (one per line for multiple accounts)

4. **Start the bot**
   ```
   node main.js
   ```

## 📝 Usage

Once started, the bot will automatically perform the following actions for each configured account:

- Log in
- Perform daily check-in
- Buy new cards (if enabled)
- Upgrade existing cards (if enabled)
- Tap (mine) until energy is depleted

You can customize the bot's behavior by modifying the `main.js` file.

## ⚠️ Disclaimer

This bot is for educational purposes only. Use at your own risk. Be sure to comply with BabyDoge's terms of service to avoid account suspension.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/Galkurta/BabyDoge-BOT/issues) if you want to contribute.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Thanks to the BabyDoge community for inspiration
- Special thanks to all contributors who have helped to improve this bot

---

Happy mining! 🐾
