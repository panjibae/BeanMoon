# 🚀 WMON Swap Bot (Node.js + Ethers.js)

Bot sederhana untuk melakukan **swap otomatis** antara WMON ↔ Token (ERC20) melalui **Bean Exchange Router**.  
Dibuat dengan **Node.js**, **ethers.js**, dan **chalk** untuk CLI interaktif yang berwarna.

---

## ✨ Fitur
- 📌 **Pilih token target** dari file `addresscontract.txt`
- 💰 **Input jumlah WMON** dan **slippage** langsung dari CLI
- 🔁 **Repeat swap**: tentukan berapa kali bolak-balik (WMON → TOKEN → WMON)
- ⏳ **Progress bar** saat delay (default 30 detik)
- 🛡 **Cek saldo token** sebelum swap balik (skip jika tidak cukup)

---

## 📂 Struktur File
.
├── index.js / swap_loop.js # Script utama
├── .env # Menyimpan PRIVATE_KEY & RPC_URL
└── addresscontract.txt # Daftar token target

### Contoh `addresscontract.txt`
BEAN 0x268E4E24E0051EC27b3D27A95977E71cE6875a05
APPMON 0xb2f82D0f38dc453D596Ad40A37799446Cc89274A
CHOG 0xE0590015A873bF326bd645c3E1266d4db41C4E6B
DAK 0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714
USDC 0xf817257fed379853cDe0fa4F97AB987181B1E5Ea


---

## ⚙️ Instalasi
1. Clone repo:
   ```bash
   git clone https://github.com/username/wmon-swap-bot.git
   cd wmon-swap-bot

npm install ethers dotenv chalk@4

.env
PRIVATE_KEY=0xPRIVATEKEYMU
RPC_URL=https://rpc-url-kamu

🛡 Disclaimer

⚠️ Gunakan wallet khusus untuk testing, jangan wallet utama.

Biaya gas & slippage bisa menyebabkan kerugian.

Bot ini dibuat untuk keperluan edukasi & riset pribadi.
