"use client"; // Ensure this file is treated as a client component in Next.js
// File: EthereumClock.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// Constants for Ethereum timing
const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;
const SECONDS_PER_EPOCH = SECONDS_PER_SLOT * SLOTS_PER_EPOCH;

// TypeScript interfaces
interface BlockData {
  gasUsed: string;
  transactions: number;
  size: number;
}

interface ClockProps {
  slotTime: number;
  slot: number;
}

const EthereumClock: React.FC = () => {
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [slot, setSlot] = useState<number>(0);
  const [epoch, setEpoch] = useState<number>(0);
  const [slotTime, setSlotTime] = useState<number>(0);
  const [blockData, setBlockData] = useState<BlockData>({
    gasUsed: '0',
    transactions: 0,
    size: 0,
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to Sepolia testnet
  useEffect(() => {
    const connectToEthereum = async (): Promise<void> => {
      try {
        // Use Infura, Alchemy, or another provider for Sepolia
        const key = process.env.NEXT_PUBLIC_INFURA_KEY;
        const ethereumProvider = new ethers.JsonRpcProvider(
          "https://sepolia.infura.io/v3/" + key // Replace with your Infura key
        );

        setProvider(ethereumProvider);
        setIsConnected(true);

        // Initial fetch
        await updateBlockchainData(ethereumProvider);

        // Subscribe to new blocks
        ethereumProvider.on("block", async (blockNumber: number) => {
          await updateBlockchainData(ethereumProvider);
        });

      } catch (err) {
        console.error("Failed to connect:", err);
        setError("Failed to connect to Ethereum network");
        setIsConnected(false);
      }
    };

    connectToEthereum();

    return () => {
      if (provider) {
        provider.removeAllListeners("block");
      }
    };
  }, []);

  // Update blockchain data
  const updateBlockchainData = async (provider: ethers.JsonRpcProvider): Promise<void> => {
    try {
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);

      if (!block) {
        throw new Error("Failed to fetch block data");
      }

      // For Sepolia testnet - this formula is an approximation
      // Ethereum mainnet genesis timestamp: 1606824023
      // Sepolia genesis timestamp is different, adjust accordingly
      const genesisTimestamp = 1655733600; // Approximate genesis for Sepolia testnet

      // Calculate current slot and epoch based on block timestamp
      // Note: This is simplified and may need adjustments for accuracy
      const timeSinceGenesis = block.timestamp - genesisTimestamp;
      const currentSlot = Math.floor(timeSinceGenesis / SECONDS_PER_SLOT);
      const currentEpoch = Math.floor(currentSlot / SLOTS_PER_EPOCH);
      const timeInSlot = timeSinceGenesis % SECONDS_PER_SLOT;

      setBlockNumber(blockNumber);
      setSlot(currentSlot);
      setEpoch(currentEpoch);
      setSlotTime(timeInSlot);

      setBlockData({
        gasUsed: block.gasUsed.toString(),
        transactions: block.transactions.length,
        size: 0, // Placeholder as 'size' is not available in the Block type
      });

    } catch (err) {
      console.error("Error fetching blockchain data:", err);
      setError("Error fetching Ethereum data");
    }
  };

  // Clock component with Three.js
  const Clock3D: React.FC<ClockProps> = ({ slotTime, slot }) => {
    const clockRef = useRef<THREE.Group>(null);
    const slotHandRef = useRef<THREE.Mesh>(null);
    const epochHandRef = useRef<THREE.Mesh>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Animation loop
    useFrame(() => {
      if (slotHandRef.current && epochHandRef.current && isLoaded) {
        // Calculate slot hand rotation (completes one revolution per slot)
        const slotAngle = ((slotTime / SECONDS_PER_SLOT) * Math.PI * 2) - Math.PI / 2;
        slotHandRef.current.rotation.z = slotAngle;

        // Calculate epoch hand rotation (completes one revolution per epoch)
        const epochAngle = (((slot % SLOTS_PER_EPOCH) / SLOTS_PER_EPOCH) * Math.PI * 2) - Math.PI / 2;
        epochHandRef.current.rotation.z = epochAngle;

        // Subtle rotation of the entire clock
        if (clockRef.current) {
          clockRef.current.rotation.y = Math.sin(Date.now() / 10000) * 0.1;
        }
      }
    });

    useEffect(() => {
      // Use a timeout or other mechanism to ensure Three.js scene is ready
      const loadTimer = setTimeout(() => {
        setIsLoaded(true);
      }, 500); // 500ms delay - adjust as necessary

      return () => clearTimeout(loadTimer);
    }, []);


    return (
      <group ref={clockRef}>
        {/* Clock face */}
        <mesh>
          <cylinderGeometry args={[5, 5, 0.5, 64]} /> {/* Increased segments for smoother circle */}
          <meshStandardMaterial color="#2a3a69" />
        </mesh>

        {/* Clock markings - More precise and visually distinct */}
        {[...Array(SLOTS_PER_EPOCH)].map((_, i) => {
          const angle = (i / SLOTS_PER_EPOCH) * Math.PI * 2;
          const x = Math.cos(angle) * 4.5;
          const y = Math.sin(angle) * 4.5;
          const isMajor = i % (SLOTS_PER_EPOCH / 4) === 0; // Mark quarters more prominently

          return (
            <mesh key={i} position={[x, y, 0.3]}>
              <boxGeometry args={[isMajor ? 0.3 : 0.15, isMajor ? 0.6 : 0.3, 0.2]} /> {/* Varying size */}
              <meshStandardMaterial color={i === (slot % SLOTS_PER_EPOCH) ? "#4CAF50" : isMajor ? "#eee" : "#ddd"} /> {/* Lighter for major, darker for minor */}
            </mesh>
          );
        })}

        {/* Slot hand (12-second rotation) - styled */}
        <mesh ref={slotHandRef} position={[0, 0, 0.35]}>
          <boxGeometry args={[0.3, 4.5, 0.2]} /> {/* Thicker and longer hand */}
          <meshStandardMaterial color="#e91e63" />
        </mesh>

        {/* Epoch hand (slower rotation - one full rotation per epoch) - styled */}
        <mesh ref={epochHandRef} position={[0, 0, 0.4]}>
          <boxGeometry args={[0.4, 3.5, 0.15]} /> {/* Thicker and slightly longer */}
          <meshStandardMaterial color="#ffc107" /> {/* Changed to a more vibrant yellow */}
        </mesh>

        {/* Center detail - more refined */}
        <mesh position={[0, 0, 0.5]}>
          <sphereGeometry args={[0.4, 32, 32]} />  {/* Increased segments for smoother sphere */}
          <meshStandardMaterial color="#fff" />
          <mesh position={[0, 0, 0.1]}> {/* Add a small, slightly raised inner sphere */}
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#424242" /> {/* Darker inner sphere */}
          </mesh>
        </mesh>
      </group>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 shadow-md">
        <h1 className="text-3xl font-bold text-center text-white">Ethereum Sepolia Clock</h1>
      </header>

      <main className="flex flex-col md:flex-row flex-grow">
        {/* 3D Clock Display */}
        <div className="w-full md:w-2/3 h-64 md:h-auto relative flex items-center justify-center">
          {isConnected ? (
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }} className="w-full h-full">
              <ambientLight intensity={0.7} /> {/* Increased ambient light */}
              <pointLight position={[5, 5, 5]} intensity={1} />
              <pointLight position={[-5, -5, 5]} intensity={0.8} /> {/* Added a second point light */}
              <Clock3D slotTime={slotTime} slot={slot} />
              <OrbitControls
                enablePan={false}
                rotateSpeed={0.5}  // Reduced rotation speed for smoother interaction
                dampingFactor={0.1} // Added damping for smoother stop
                enableDamping
              />
            </Canvas>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                {error ? (
                  <p className="text-red-500 text-lg">{error}</p>
                ) : (
                  <p className="text-gray-300 text-lg">Connecting to Ethereum Sepolia network...</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Data Display */}
        <div className="w-full md:w-1/3 bg-gray-800 p-6">
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-4 shadow-md">
              <h2 className="text-xl font-semibold mb-3 text-gray-200">Ethereum Time</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Current Epoch</p>
                  <p className="text-2xl font-mono text-white">{epoch}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Current Slot</p>
                  <p className="text-2xl font-mono text-white">{slot}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Slot in Epoch</p>
                  <p className="text-xl font-mono text-white">{slot % SLOTS_PER_EPOCH}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Slot Time</p>
                  <p className="text-xl font-mono text-white">{slotTime}s</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 shadow-md">
              <h2 className="text-xl font-semibold mb-3 text-gray-200">Chain Data</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Block Number</p>
                  <p className="text-xl font-mono text-white">{blockNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Gas Used</p>
                  <p className="text-xl font-mono text-white">{blockData.gasUsed}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Transactions</p>
                  <p className="text-xl font-mono text-white">{blockData.transactions}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Block Size</p>
                  <p className="text-xl font-mono text-white">{blockData.size} bytes</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 shadow-md">
              <h2 className="text-xl font-semibold mb-3 text-gray-200">Legend</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-pink-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-300">Slot Hand (12s)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-300">Epoch Hand (6.4min)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-300">Current Slot Marker</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 p-3 text-center text-sm text-gray-400 mt-8">
        <p>Data from Ethereum Sepolia Testnet • Slots: 12s • Epochs: 32 slots (6.4 min)</p>
      </footer>
    </div>
  );
};

export default EthereumClock;
