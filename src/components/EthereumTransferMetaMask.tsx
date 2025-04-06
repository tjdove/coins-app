"use client";
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RPC_ENDPOINTS: string[] = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.drpc.org"
];

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function EthereumTransferMetaMask() {
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("metamask");

  // Check for MetaMask on component mount
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      checkMetaMaskConnection();
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const checkMetaMaskConnection = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setIsMetaMaskConnected(true);
        setFromAddress(accounts[0]);
      }
    } catch (err) {
      console.error("Error checking MetaMask connection:", err);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setFromAddress(accounts[0]);
      setIsMetaMaskConnected(true);
    } else {
      setIsMetaMaskConnected(false);
      setFromAddress("");
    }
  };

  const connectMetaMask = async () => {
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setIsMetaMaskConnected(true);
      setFromAddress(accounts[0]);
    } catch (err) {
      setError("Failed to connect MetaMask");
      console.error(err);
    }
  };

  async function getProvider(): Promise<ethers.BrowserProvider | ethers.JsonRpcProvider> {
    if (activeTab === "metamask" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const provider = new ethers.JsonRpcProvider(endpoint);
        await provider.getBlockNumber();
        return provider;
      } catch (e) {
        console.warn(`Failed with ${endpoint}, trying next...`);
      }
    }
    throw new Error("All RPC endpoints failed");
  }

  const transferEth = async () => {
    setError("");
    setShowResult(false);
    setIsLoading(true);

    // Validate inputs
    if (!ethers.isAddress(toAddress)) {
      setError("⚠️ Invalid recipient address!");
      setIsLoading(false);
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("⚠️ Please enter a valid amount");
      setIsLoading(false);
      return;
    }

    try {
      const provider = await getProvider();
      let signer;

      if (activeTab === "metamask") {
        if (!isMetaMaskConnected) {
          await connectMetaMask();
        }
        signer = await provider.getSigner();
      } else {
        setError("Manual transfers disabled - use MetaMask for security");
        setIsLoading(false);
        return;
      }

      const tx = {
        to: toAddress,
        value: ethers.parseEther(amount)
      };

      // Send transaction via MetaMask
      const txResponse = await signer.sendTransaction(tx);
      setTxHash(txResponse.hash);

      // Wait for transaction to be mined
      await txResponse.wait();
      setShowResult(true);
    } catch (err: any) {
      setError(`❌ Transaction failed: ${err.message}`);
      console.error("Transaction Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>↗️</span>
          <span>ETH Transfer</span>
        </CardTitle>
        <div className="flex justify-center">
          <Badge variant="secondary" className="mt-2">
            Sepolia Testnet
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="metamask">MetaMask</TabsTrigger>
          </TabsList>
          <TabsContent value="metamask">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>From Address:</Label>
                {isMetaMaskConnected ? (
                  <Input
                    value={fromAddress}
                    readOnly
                  />
                ) : (
                  <Button 
                    onClick={connectMetaMask}
                    className="w-full"
                  >
                    Connect MetaMask
                  </Button>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="toAddress">To Address:</Label>
                <Input
                  id="toAddress"
                  placeholder="0x..."
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (ETH):</Label>
                <Input
                  id="amount"
                  placeholder="0.1"
                  type="number"
                  step="0.001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <Button 
                onClick={transferEth}
                disabled={isLoading || !isMetaMaskConnected}
                className="w-full mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Waiting for MetaMask...
                  </>
                ) : (
                  "Transfer ETH"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      {showResult && (
        <CardFooter>
          <div className="space-y-2 w-full">
            <h2 className="text-lg font-semibold">Transaction Successful!</h2>
            <p className="text-sm">
              <span className="font-medium">From:</span> {fromAddress}
            </p>
            <p className="text-sm">
              <span className="font-medium">To:</span> {toAddress}
            </p>
            <p className="text-sm">
              <span className="font-medium">Amount:</span> {amount} ETH
            </p>
            <p className="text-sm break-all">
              <span className="font-medium">Tx Hash:</span> {txHash}
            </p>
            <a 
              href={`https://sepolia.etherscan.io/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline"
            >
              View on Etherscan
            </a>
            <p className="text-xs text-muted-foreground mt-2">
              This was a testnet transaction (no real value)
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}