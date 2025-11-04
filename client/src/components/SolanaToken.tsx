import { useState, useEffect } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";

interface SolanaTokenProps {
  className?: string;
}

export default function SolanaToken({ className = "" }: SolanaTokenProps) {
  // Hardcoded token address for now
  const mintAddress = "DumbGPTTokenAddressWillBeHereSoon123456789";
  const [isCopied, setIsCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Entrance animation with attention-grabbing effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mintAddress);
      setIsCopied(true);

      // Reset back to "Copy" after 3 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  // Truncate address for mobile display
  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  return (
    <div
      className={`flex items-center gap-2 bg-gray-700/50 rounded-lg px-2 sm:px-3 py-2 border border-gray-600/50 backdrop-blur-sm hover:bg-gray-700/70 transition-all duration-300 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${className}`}
    >
      {/* Token address */}
      <div className="flex items-center min-w-0">
        <div className="text-xs sm:text-sm font-mono text-gray-200 truncate">
          {/* Full address on larger screens */}
          <span className="hidden md:inline">{mintAddress}</span>
          {/* Medium truncation on tablets */}
          <span className="hidden sm:inline md:hidden">
            {truncateAddress(mintAddress, 8, 6)}
          </span>
          {/* Short truncation on mobile */}
          <span className="sm:hidden">
            {truncateAddress(mintAddress, 4, 4)}
          </span>
        </div>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-300 flex-shrink-0 shadow-sm transform ${
          isCopied
            ? "bg-green-600 hover:bg-green-700 text-white scale-105"
            : "bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800 hover:scale-105"
        }`}
        title={isCopied ? "Copied!" : "Copy address"}
      >
        {isCopied ? (
          <>
            <FiCheck size={10} className="sm:hidden" />
            <FiCheck size={12} className="hidden sm:inline" />
          </>
        ) : (
          <>
            <FiCopy size={10} className="sm:hidden" />
            <FiCopy size={12} className="hidden sm:inline" />
          </>
        )}
        <span className="whitespace-nowrap">
          {isCopied ? "Copied!" : "Copy"}
        </span>
      </button>
    </div>
  );
}
