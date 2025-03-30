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

const RPC_ENDPOINTS: string[] = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.drpc.org"
];

export function EthereumBalanceChecker() {
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0 ETH");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showResult, setShowResult] = useState<boolean>(false);

  async function getProvider(): Promise<ethers.JsonRpcProvider> {
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const provider = new ethers.JsonRpcProvider(endpoint);
        await provider.getBlockNumber(); // Test connection
        return provider;
      } catch (e) {
        console.warn(`Failed with ${endpoint}, trying next...`);
      }
    }
    throw new Error("All RPC endpoints failed");
  }

  const checkBalance = async () => {
    setError("");
    setShowResult(false);
    setIsLoading(true);

    if (!address || !ethers.isAddress(address)) {
      setError("⚠️ Invalid Ethereum address!");
      setIsLoading(false);
      return;
    }

    try {
      const provider = await getProvider();
      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);
      
      setBalance(`${balanceInEth} ETH`);
      setShowResult(true);
    } catch (err) {
      setError("❌ Network error. Please try again later.");
      console.error("RPC Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔍</span>
          <span>Ethereum Balance Checker</span>
        </CardTitle>
        <div className="flex justify-center">
          <Badge variant="secondary" className="mt-2">
            Sepolia Testnet
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ethAddress">
            Enter a Sepolia testnet address to check its balance:
          </Label>
          <Input
            id="ethAddress"
            placeholder="e.g., 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <Button 
          onClick={checkBalance}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Check Balance"
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
            <h2 className="text-lg font-semibold">Sepolia Balance</h2>
            <p className="text-2xl font-bold">{balance}</p>
            <p className="text-sm text-muted-foreground">
              This is testnet ETH (no real value)
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}