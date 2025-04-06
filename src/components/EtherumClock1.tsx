// File: EthereumClock.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// Constants for Ethereum timing
const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;
const SECONDS_PER_EPOCH = SECONDS_PER_SLOT * SLOTS_PER_EPOCH;

 const EthereumClock: React.FC = () => {
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [blockNumber, setBlockNumber] = useState(0);
  const [slot, setSlot] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [slotTime, setSlotTime] = useState(0);
  const [blockData, setBlockData] = useState({
    gasUsed: 0,
    transactions: 0,
    size: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to Sepolia testnet
  useEffect(() => {
    const connectToEthereum = async () => {
      try {
        // Use Infura, Alchemy, or another provider for Sepolia
        const ethereumProvider = new ethers.JsonRpcProvider(
          "https://sepolia.infura.io/v3/YOUR_INFURA_KEY" // Replace with your Infura key
        );
        
        setProvider(ethereumProvider);
        setIsConnected(true);
        
        // Initial fetch
        updateBlockchainData(ethereumProvider);
        
        // Subscribe to new blocks
        ethereumProvider.on("block", (blockNumber) => {
          updateBlockchainData(ethereumProvider);
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
  const updateBlockchainData = async (provider: ethers.JsonRpcProvider) => {
    try {
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);
      
      // For Sepolia testnet - this formula is an approximation
      // Ethereum mainnet genesis timestamp: 1606824023
      // Sepolia genesis timestamp is different, adjust accordingly
      const genesisTimestamp = 1655733600; // Approximate genesis for Sepolia testnet
      
      // Calculate current slot and epoch based on block timestamp
      // Note: This is simplified and may need adjustments for accuracy
      if (block) {
        const timeSinceGenesis = block.timestamp - genesisTimestamp;
        const currentSlot = Math.floor(timeSinceGenesis / SECONDS_PER_SLOT);
        const currentEpoch = Math.floor(currentSlot / SLOTS_PER_EPOCH);
        const slotInEpoch = currentSlot % SLOTS_PER_EPOCH;
        const timeInSlot = timeSinceGenesis % SECONDS_PER_SLOT;
        
        setBlockNumber(blockNumber);
        setSlot(currentSlot);
        setEpoch(currentEpoch);
        setSlotTime(timeInSlot);
        
        setBlockData({
          gasUsed: Number(block.gasUsed),
          transactions: block.transactions.length,
          size: 0, // Placeholder as 'size' is not available in the Block type
        });
      } else {
        console.error("Block data is null");
        setError("Failed to fetch block data");
      }
      
    } catch (err) {
      console.error("Error fetching blockchain data:", err);
      setError("Error fetching Ethereum data");
    }
  };

  // Clock component with Three.js
  const Clock3D = () => {
    const clockRef = React.useRef<THREE.Group | null>(null);
    const slotHandRef = React.useRef<THREE.Mesh | null>(null);
    const epochHandRef = React.useRef<THREE.Mesh | null>(null);
    
    // Animation loop
    useFrame(() => {
      if (slotHandRef.current && epochHandRef.current) {
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

    return (
      <group ref={clockRef}>
        {/* Clock face */}
        <mesh>
          <cylinderGeometry args={[5, 5, 0.5, 32]} />
          <meshStandardMaterial color="#2a3a69" />
        </mesh>
        
        {/* Clock markings */}
        {[...Array(SLOTS_PER_EPOCH)].map((_, i) => {
          const angle = (i / SLOTS_PER_EPOCH) * Math.PI * 2;
          const x = Math.cos(angle) * 4.5;
          const y = Math.sin(angle) * 4.5;
          return (
            <mesh key={i} position={[x, y, 0.3]}>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial color={i === (slot % SLOTS_PER_EPOCH) ? "#4CAF50" : "#ddd"} />
            </mesh>
          );
        })}
        
        {/* Slot hand (12-second rotation) */}
        <mesh ref={slotHandRef} position={[0, 0, 0.35]}>
          <boxGeometry args={[0.2, 4, 0.1]} />
          <meshStandardMaterial color="#e91e63" />
        </mesh>
        
        {/* Epoch hand (slower rotation - one full rotation per epoch) */}
        <mesh ref={epochHandRef} position={[0, 0, 0.4]}>
          <boxGeometry args={[0.3, 3, 0.1]} />
          <meshStandardMaterial color="#ffeb3b" />
        </mesh>
        
        {/* Center dot */}
        <mesh position={[0, 0, 0.5]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      </group>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4">
        <h1 className="text-2xl font-bold text-center">Ethereum Sepolia Clock</h1>
      </header>
      
      <main className="flex flex-col md:flex-row flex-grow">
        {/* 3D Clock Display */}
        <div className="w-full md:w-2/3 h-64 md:h-auto relative">
          {isConnected ? (
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <Clock3D />
              <OrbitControls enablePan={false} />
            </Canvas>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                {error ? (
                  <p className="text-red-500">{error}</p>
                ) : (
                  <p>Connecting to Ethereum Sepolia network...</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Data Display */}
        <div className="w-full md:w-1/3 bg-gray-800 p-6">
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">Ethereum Time</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Current Epoch</p>
                  <p className="text-2xl font-mono">{epoch}</p>
                </div>
                <div>
                  <p className="text-gray-400">Current Slot</p>
                  <p className="text-2xl font-mono">{slot}</p>
                </div>
                <div>
                  <p className="text-gray-400">Slot in Epoch</p>
                  <p className="text-xl font-mono">{slot % SLOTS_PER_EPOCH}</p>
                </div>
                <div>
                  <p className="text-gray-400">Slot Time</p>
                  <p className="text-xl font-mono">{slotTime}s</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">Chain Data</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Block Number</p>
                  <p className="text-xl font-mono">{blockNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400">Gas Used</p>
                  <p className="text-xl font-mono">{blockData.gasUsed}</p>
                </div>
                <div>
                  <p className="text-gray-400">Transactions</p>
                  <p className="text-xl font-mono">{blockData.transactions}</p>
                </div>
                <div>
                  <p className="text-gray-400">Block Size</p>
                  <p className="text-xl font-mono">{blockData.size} bytes</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">Legend</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-pink-500 mr-2"></div>
                  <span>Slot Hand (12s)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-400 mr-2"></div>
                  <span>Epoch Hand (6.4min)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 mr-2"></div>
                  <span>Current Slot Marker</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 p-3 text-center text-sm">
        <p>Data from Ethereum Sepolia Testnet • Slots: 12s • Epochs: 32 slots (6.4 min)</p>
      </footer>
    </div>
  );
};

export default EthereumClock;

// For use in your React application:
// 1. Install dependencies:
// npm install ethers@5.7.2 three @react-three/fiber @react-three/drei

// 2. Import and use this component in App.js:
// import EthereumClock from './EthereumClock';
// function App() {
//   return <EthereumClock />;
// }
// export default App;