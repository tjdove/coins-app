import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function EthereumBalanceChecker() {
  return (
    <Card className="w-full max-w-md">
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
          />
        </div>

        <Button id="checkBalanceBtn" className="w-full">
          Check Balance
        </Button>

        <div id="loading" className="flex items-center justify-center gap-2 hidden">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>

        <div id="error" className="text-destructive text-sm hidden"></div>
      </CardContent>

      <CardFooter className="hidden" id="result">
        <div className="space-y-2 w-full">
          <h2 className="text-lg font-semibold">Sepolia Balance</h2>
          <p id="balance" className="text-2xl font-bold">0 ETH</p>
          <p className="text-sm text-muted-foreground">
            This is testnet ETH (no real value)
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}