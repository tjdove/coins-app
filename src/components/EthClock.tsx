"use client"; // Ensure this file is treated as a client component in Next.js
// File: EthClock.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

// Constants for Ethereum timing
const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;
const SECONDS_PER_EPOCH = SECONDS_PER_SLOT * SLOTS_PER_EPOCH;
// Sepolia Testnet Genesis Timestamp (approximate)
const SEPOLIA_GENESIS_TIMESTAMP = 1655733600;

// TypeScript interfaces
interface BlockData {
  gasUsed: string;
  transactions: number;
  size: number;
}

const EthClock: React.FC = () => {
  // State variables for Ethereum data
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [slot, setSlot] = useState<number>(0);
  const [epoch, setEpoch] = useState<number>(0);
  // State for the continuously updating slot time display (0-11 seconds)
  const [displaySlotTime, setDisplaySlotTime] = useState<number>(0);
  // State to store the calculated start timestamp of the current slot
  const [currentSlotStartTimestamp, setCurrentSlotStartTimestamp] = useState<number>(0);
  const [blockData, setBlockData] = useState<BlockData>({
    gasUsed: '0',
    transactions: 0,
    size: 0,
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to store the interval ID for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect hook to connect to Ethereum (Sepolia Testnet)
  useEffect(() => {
    const connectToEthereum = async (): Promise<void> => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_INFURA_KEY || "YOUR_INFURA_API_KEY";
        if (apiKey === "YOUR_INFURA_API_KEY") {
           console.warn("Using fallback Infura Key. Please set NEXT_PUBLIC_INFURA_KEY environment variable.");
        }

        const ethereumProvider = new ethers.JsonRpcProvider(
          `https://sepolia.infura.io/v3/${apiKey}`
        );

        setProvider(ethereumProvider);
        setIsConnected(true);
        setError(null);

        // Initial fetch of blockchain data
        await updateBlockchainData(ethereumProvider);

        // Set up listener for new blocks
        ethereumProvider.on("block", async (newBlockNumber: number) => {
          console.log("New block received:", newBlockNumber);
          await updateBlockchainData(ethereumProvider);
        });

      } catch (err) {
        console.error("Failed to connect or fetch initial data:", err);
        setError("Failed to connect to Ethereum network. Check console and API key.");
        setIsConnected(false);
      }
    };

    connectToEthereum();

    // Cleanup function to remove listener on component unmount
    return () => {
      if (provider) {
        console.log("Removing block listener");
        provider.removeAllListeners("block");
      }
      // Clear the interval timer on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount

  // Function to fetch and update blockchain data - triggered by new blocks
  const updateBlockchainData = async (currentProvider: ethers.JsonRpcProvider): Promise<void> => {
    try {
      const latestBlockNumber = await currentProvider.getBlockNumber();
      const block = await currentProvider.getBlock(latestBlockNumber);

      if (!block) {
        throw new Error(`Failed to fetch block data for block #${latestBlockNumber}`);
      }

      // Calculate current slot and epoch based on the latest block's timestamp
      const timeSinceGenesis = block.timestamp - SEPOLIA_GENESIS_TIMESTAMP;
      const currentSlot = Math.floor(timeSinceGenesis / SECONDS_PER_SLOT);
      const currentEpoch = Math.floor(currentSlot / SLOTS_PER_EPOCH);

      // Calculate the precise start timestamp of the current slot
      const slotStartTime = SEPOLIA_GENESIS_TIMESTAMP + currentSlot * SECONDS_PER_SLOT;
      setCurrentSlotStartTimestamp(slotStartTime); // Store the start time for the timer

      // Update state variables related to block/epoch/slot
      setBlockNumber(latestBlockNumber);
      setSlot(currentSlot);
      setEpoch(currentEpoch);

      setBlockData({
        gasUsed: block.gasUsed.toString(),
        transactions: block.transactions.length,
        size: 0,
      });
      setError(null); // Clear error on successful update

      // Immediately calculate and set the display time based on current time
      // This ensures the timer starts correctly when a block arrives
      const nowSeconds = Date.now() / 1000;
      const elapsedInSlot = Math.floor(nowSeconds - slotStartTime) % SECONDS_PER_SLOT;
      setDisplaySlotTime(elapsedInSlot >= 0 ? elapsedInSlot : 0); // Ensure non-negative

    } catch (err) {
      console.error("Error fetching blockchain data:", err);
      setError(`Error fetching Ethereum data: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Effect hook to run the continuous slot timer
  useEffect(() => {
    // Clear any existing interval when the slot start time changes or component mounts/unmounts
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only start the timer if we have a valid slot start time
    if (currentSlotStartTimestamp > 0) {
      intervalRef.current = setInterval(() => {
        const nowSeconds = Date.now() / 1000;
        // Calculate elapsed seconds since the known start of the slot
        const elapsedSeconds = nowSeconds - currentSlotStartTimestamp;
        // Get the remainder modulo 12 to find the second within the slot (0-11)
        const currentSecondInSlot = Math.floor(elapsedSeconds) % SECONDS_PER_SLOT;

        // Update the display state, ensuring it's not negative if clocks are slightly off
        setDisplaySlotTime(currentSecondInSlot >= 0 ? currentSecondInSlot : 0);

      }, 1000); // Update every second
    }

    // Cleanup function for this effect
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentSlotStartTimestamp]); // Rerun this effect when the slot start time changes

  // Calculate progress within the current slot (0 to 100) using the display time
  const slotProgress = (displaySlotTime / (SECONDS_PER_SLOT -1)) * 100 ; // Use displaySlotTime, adjust denominator for 0-11 range

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white font-sans items-center justify-center p-4">
      {/* Header */}
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Ethereum Digital Clock</h1>
        <p className="text-lg text-blue-300">Sepolia Testnet</p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl bg-gray-800 bg-opacity-70 rounded-xl shadow-2xl p-6 md:p-10 backdrop-filter backdrop-blur-lg border border-gray-700">
        {/* Connection Status / Error Message */}
        {!isConnected && !error && ( // Show connecting only if no error
          <div className="mb-6 p-4 bg-yellow-600 bg-opacity-80 rounded-lg text-center">
            <p className="font-semibold">Connecting to Ethereum Sepolia network...</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-600 bg-opacity-80 rounded-lg text-center">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Digital Clock Display */}
        <div className="text-center mb-8 md:mb-12">
          <div className="mb-4">
            <span className="text-xl md:text-2xl text-blue-300 uppercase tracking-widest">Epoch</span>
            <p className="text-6xl md:text-8xl font-mono font-bold text-white tracking-tighter">{epoch}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <span className="text-lg md:text-xl text-blue-300 uppercase tracking-widest">Slot</span>
              <p className="text-4xl md:text-5xl font-mono font-semibold text-white">{slot}</p>
              <p className="text-sm text-gray-400">({slot % SLOTS_PER_EPOCH} / {SLOTS_PER_EPOCH})</p>
            </div>
            <div>
              <span className="text-lg md:text-xl text-blue-300 uppercase tracking-widest">Slot Time</span>
              {/* Display the continuously updating state */}
              <p className="text-4xl md:text-5xl font-mono font-semibold text-white">
                 {displaySlotTime}
                 <span className="text-2xl align-baseline">s</span>
              </p>
              {/* Progress Bar for Slot Time - uses displaySlotTime */}
              <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2 overflow-hidden"> {/* Added overflow-hidden */}
                <div
                  className="bg-blue-500 h-2.5 rounded-full" // Removed transition for instant update
                  style={{ width: `${slotProgress}%` }}
                  aria-valuenow={displaySlotTime}
                  aria-valuemin={0}
                  aria-valuemax={SECONDS_PER_SLOT - 1}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-600 my-6 md:my-8" />

        {/* Chain Data Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-center text-gray-200">Latest Block Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Block Number</p>
              <p className="text-xl md:text-2xl font-mono text-white">{blockNumber}</p>
            </div>
            <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Gas Used</p>
              <p className="text-xl md:text-2xl font-mono text-white">{parseInt(blockData.gasUsed).toLocaleString()}</p>
            </div>
            <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Transactions</p>
              <p className="text-xl md:text-2xl font-mono text-white">{blockData.transactions}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mt-8 text-center text-sm text-gray-400">
        <p>Slots: {SECONDS_PER_SLOT}s each • Epochs: {SLOTS_PER_EPOCH} slots ({SECONDS_PER_EPOCH / 60} min)</p>
        <p>Displaying data from Ethereum Sepolia Testnet.</p>
      </footer>
    </div>
  );
};

export default EthClock;
