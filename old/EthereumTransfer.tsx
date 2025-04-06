"use client";
import { useState } from 'react';
import { ethers } from 'ethers';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const RPC_ENDPOINTS: string[] = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.drpc.org"
];

export function EthereumTransfer() {
  const [fromAddress, setFromAddress] = useState<string>("");
  const [toAddress, setToAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [showResult, setShowResult] = useState<boolean>(false);

  async function getProvider(): Promise<ethers.JsonRpcProvider> {
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
    if (!ethers.isAddress(fromAddress) || !ethers.isAddress(toAddress)) {
      setError("⚠️ Invalid Ethereum address!");
      setIsLoading(false);
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("⚠️ Please enter a valid amount");
      setIsLoading(false);
      return;
    }

    if (!privateKey || !privateKey.startsWith("0x") || privateKey.length !== 66) {
      setError("⚠️ Invalid private key");
      setIsLoading(false);
      return;
    }

    try {
      const provider = await getProvider();
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Validate sender address matches private key
      if (wallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
        setError("⚠️ Private key doesn't match sender address");
        setIsLoading(false);
        return;
      }

      const tx = {
        to: toAddress,
        value: ethers.parseEther(amount)
      };

      // Send transaction
      const txResponse = await wallet.sendTransaction(tx);
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
        <div className="space-y-2">
          <Label htmlFor="fromAddress">From Address:</Label>
          <Input
            id="fromAddress"
            placeholder="0x..."
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="privateKey">Private Key:</Label>
          <Input
            id="privateKey"
            type="password"
            placeholder="0x..."
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Only used locally - never sent to servers
          </p>
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
          disabled={isLoading}
          className="w-full mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Transfer ETH"
          )}
        </Button>

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
            <p className="text-xs text-muted-foreground mt-2">
              This was a testnet transaction (no real value)
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}