import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm"
// import { getProvider } from "./Provider.js"

// List of reliable Sepolia RPC endpoints
const RPC_ENDPOINTS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.drpc.org",
]

document.addEventListener("DOMContentLoaded", () => {
  const checkBalanceBtn = document.getElementById("checkBalanceBtn")
  const ethAddressInput = document.getElementById("ethAddress")
  const resultDiv = document.getElementById("result")
  const errorDiv = document.getElementById("error")
  const loadingDiv = document.getElementById("loading")
  const balanceSpan = document.getElementById("balance")

  // Initialize UI
  errorDiv.style.display = "none"
  resultDiv.style.display = "none"
  loadingDiv.style.display = "none"

  checkBalanceBtn.addEventListener("click", async () => {
    const address = ethAddressInput.value.trim()

    // Reset UI
    errorDiv.style.display = "none"
    resultDiv.style.display = "none"
    loadingDiv.style.display = "block"

    // Validate address
    if (!address || !ethers.isAddress(address)) {
      showError("⚠️ Invalid Ethereum address!")
      return
    }

    try {
      const provider = await getProvider()
      const balance = await provider.getBalance(address)
      const balanceInEth = ethers.formatEther(balance)

      balanceSpan.textContent = `${balanceInEth} ETH`
      resultDiv.style.display = "block"
    } catch (err) {
      showError("❌ Network error. Please try again later.")
      console.error("RPC Error:", err)
    } finally {
      loadingDiv.style.display = "none"
    }
  })

  function showError(message) {
    errorDiv.textContent = message
    errorDiv.style.display = "block"
    loadingDiv.style.display = "none"
  }
})
