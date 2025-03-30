import { EthereumBalanceChecker } from "@/components/EthereumBalanceChecker";

export default  function App() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <EthereumBalanceChecker />
    </div>
  );
}