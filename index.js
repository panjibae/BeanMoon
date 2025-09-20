require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const readline = require("readline");
const chalk = require("chalk");   // install v4 → npm install chalk@4

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (ans) => { rl.close(); res(ans); }));
}

function delayWithBar(ms) {
  return new Promise((resolve) => {
    const steps = 30;
    const stepTime = ms / steps;
    let current = 0;
    const interval = setInterval(() => {
      current++;
      const bar = chalk.green("█".repeat(current)) + chalk.gray("-".repeat(steps - current));
      process.stdout.write(`\r⏳ Menunggu [${bar}] ${current}s/${steps}s`);
      if (current >= steps) {
        clearInterval(interval);
        process.stdout.write("\n");
        resolve();
      }
    }, stepTime);
  });
}

async function getBalanceETH(provider, address) {
  const bal = await provider.getBalance(address);
  return ethers.utils.formatEther(bal);
}

async function main() {
  console.log(chalk.cyan("\n=== 🚀 SWAP BOT WMON ↔ TOKEN ===\n"));

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("🔑 Wallet:", chalk.green(wallet.address));

  // === Router ===
  const routerAddr = ethers.utils.getAddress("0xca810d095e90daae6e867c19df6d9a8c56db2c89");
  const routerAbi = [
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)"
  ];
  const router = new ethers.Contract(routerAddr, routerAbi, wallet);

  const wmonAddr = ethers.utils.getAddress("0x760afe86e5de5fa0ee542fc7b7b713e1c5425701");

  // === Baca file token list ===
  const lines = fs.readFileSync("addresscontract.txt", "utf8").trim().split("\n");
  const tokens = lines.map((l) => {
    const [name, addr] = l.trim().split(/\s+/);
    return { name: name.toUpperCase(), address: ethers.utils.getAddress(addr) };
  });

  console.log(chalk.blue("\n📌 Pilih token target:"));
  tokens.forEach((t, i) => {
    console.log(`[${i + 1}] ${chalk.yellow(t.name)}  ${chalk.gray(t.address)}`);
  });

  const choice = await ask("\n👉 Masukkan nomor token: ");
  const target = tokens[parseInt(choice) - 1];
  if (!target) {
    console.log(chalk.red("❌ Pilihan tidak valid"));
    return;
  }
  console.log("🎯 Target token:", chalk.yellow(target.name), target.address);

  // === Input jumlah & slippage & berapa kali swap ===
  const amountInput = await ask("\n💰 Masukkan jumlah WMON tiap swap: ");
  const slippageInput = await ask("📉 Slippage % (contoh 5 = 5%): ");
  const repeatInput = await ask("🔁 Mau berapa kali swap bolak-balik?: ");

  const slippage = parseFloat(slippageInput) / 100;
  const repeat = parseInt(repeatInput);
  const amountWei = ethers.utils.parseEther(amountInput);

  for (let round = 1; round <= repeat; round++) {
    console.log(chalk.cyan(`\n=== 🔄 Swap Round ${round}/${repeat} ===`));

    // === STEP 1: Swap WMON → Target ===
    console.log("💰 ETH sebelum swap:", await getBalanceETH(provider, wallet.address));
    const pathFwd = [wmonAddr, target.address];
    const outs = await router.getAmountsOut(amountWei, pathFwd);
    const expectedOut = outs[1];
    const minOut = expectedOut.sub(expectedOut.mul(Math.floor(slippage * 100)).div(100));

    console.log(`🚀 Swap ${chalk.green(amountInput)} WMON → ${chalk.yellow(target.name)}, estimasi out: ${chalk.magenta(expectedOut.toString())}`);
    let txFwd;
    try {
      txFwd = await router.swapExactETHForTokens(
        minOut,
        pathFwd,
        wallet.address,
        Math.floor(Date.now() / 1000) + 60 * 20,
        { value: amountWei, gasLimit: 300000 }
      );
      const receiptFwd = await txFwd.wait();
      console.log("✅ Swap ke token sukses, block:", chalk.green(receiptFwd.blockNumber));
    } catch (err) {
      console.error(chalk.red("❌ Swap gagal:"), err.message);
      return;
    }

    // === Delay 30 detik ===
    console.log("\n⏳ Tunggu 30 detik sebelum swap balik...");
    await delayWithBar(30000);

    // === STEP 2: Swap balik Target → WMON ===
    const erc20Abi = [
      "function approve(address spender, uint amount) external returns (bool)",
      "function balanceOf(address account) external view returns (uint)"
    ];
    const token = new ethers.Contract(target.address, erc20Abi, wallet);
    const balToken = await token.balanceOf(wallet.address);

    console.log("💰 Token balance untuk swap balik:", chalk.magenta(balToken.toString()));

    if (balToken.eq(0)) {
      console.log(chalk.red("❌ Tidak ada saldo token untuk swap balik. Skip round ini."));
      continue;
    }

    // minimal check: jangan swap kalau token terlalu kecil (<1000)
    if (balToken.lt(1000)) {
      console.log(chalk.red("⚠️ Saldo token terlalu kecil, skip swap balik."));
      continue;
    }

    const approveTx = await token.approve(routerAddr, balToken);
    await approveTx.wait();
    console.log("✅ Approve sukses");

    const pathBack = [target.address, wmonAddr];
    const outsBack = await router.getAmountsOut(balToken, pathBack);
    const expectedBack = outsBack[1];
    const minOutBack = expectedBack.sub(expectedBack.mul(Math.floor(slippage * 100)).div(100));

    console.log(`🚀 Swap balik ${chalk.yellow(target.name)} → WMON, estimasi out: ${chalk.magenta(expectedBack.toString())}`);
    try {
      const txBack = await router.swapExactTokensForETH(
        balToken,
        minOutBack,
        pathBack,
        wallet.address,
        Math.floor(Date.now() / 1000) + 60 * 20,
        { gasLimit: 300000 }
      );
      const receiptBack = await txBack.wait();
      console.log("✅ Swap balik selesai, block:", chalk.green(receiptBack.blockNumber));
      console.log("💰 ETH setelah swap balik:", chalk.green(await getBalanceETH(provider, wallet.address)));
    } catch (err) {
      console.error(chalk.red("❌ Swap balik gagal:"), err.message);
    }
  }

  console.log(chalk.cyan("\n=== 🎉 Semua proses swap selesai ===\n"));
}

main().catch(console.error);
