import { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import dynamic from 'next/dynamic';
import 'tailwindcss/tailwind.css';

export default function Home() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [showMenu, setShowMenu] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const bird = useRef({ x: 80, y: 300, width: 50, height: 50, velocity: 0, gravity: 0.06, lift: -2.2 });
  const pipes = useRef([]);
  const landakImg = useRef(null);
  const bambooImg = useRef(null);
  const frame = useRef(0);

  const contractAddress = "0x228a78f7484dcDD40C33C9Bfb9F7eFEb3d2655D6";
  const fullABI = [
    {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
    {"inputs":[],"name":"distributeRewards","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[],"name":"getTopPlayers","outputs":[{"components":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"score","type":"uint256"}],"internalType":"struct Leaderboard.Player[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"scores","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"newScore","type":"uint256"}],"name":"submitScore","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"topPlayers","outputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"score","type":"uint256"}],"stateMutability":"view","type":"function"}
  ];

  useEffect(() => {
    landakImg.current = new Image();
    landakImg.current.src = "https://aqua-glad-tern-369.mypinata.cloud/ipfs/bafybeic2hc4o3ivhtoa3urf4ehgguiehi5crbl2evry5qydcsq2g4ejg7m";

    bambooImg.current = new Image();
    bambooImg.current.src = "https://aqua-glad-tern-369.mypinata.cloud/ipfs/bafkreicbretqtvephhgmcr7rb57rjxxubbpkxie5bl7ycm5wciqf7bjlsi";
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const update = () => {
      frame.current++;
      bird.current.velocity += bird.current.gravity;
      bird.current.y += bird.current.velocity;

      if (frame.current % 150 === 0) {
        const top = Math.random() * (canvas.height - 170 - 200) + 50;
        const bottom = canvas.height - top - 170;
        pipes.current.push({ x: canvas.width, top, bottom, padding: 10 });
      }

      pipes.current.forEach((p, i) => {
        p.x -= 1.2;
        if (p.x + 60 < 0) {
          pipes.current.splice(i, 1);
          setScore(prev => prev + 1);
        }

        if (
          bird.current.x < p.x + 60 - p.padding &&
          bird.current.x + bird.current.width > p.x + p.padding &&
          (bird.current.y < p.top || bird.current.y + bird.current.height > canvas.height - p.bottom)
        ) {
          submitAndShowGameOver();
        }
      });

      if (bird.current.y + bird.current.height > canvas.height || bird.current.y < 0) {
        submitAndShowGameOver();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (landakImg.current.complete) ctx.drawImage(landakImg.current, bird.current.x, bird.current.y, bird.current.width, bird.current.height);
      pipes.current.forEach(p => {
        if (bambooImg.current.complete) {
          ctx.drawImage(bambooImg.current, p.x, 0, 60, p.top);
          ctx.drawImage(bambooImg.current, p.x, canvas.height - p.bottom, 60, p.bottom);
        }
      });

      requestAnimationFrame(update);
    };

    if (!showMenu) update();

    const jump = () => (bird.current.velocity = bird.current.lift);
    window.addEventListener('keydown', (e) => e.code === 'Space' && jump());
    window.addEventListener('touchstart', jump);

    return () => {
      window.removeEventListener('keydown', jump);
      window.removeEventListener('touchstart', jump);
    };
  }, [showMenu]);

  useEffect(() => {
    let interval;
    if (showLeaderboard) {
      fetchLeaderboard();
      interval = setInterval(fetchLeaderboard, 10000);
    }
    return () => clearInterval(interval);
  }, [showLeaderboard]);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      const contract = new ethers.Contract(contractAddress, fullABI, provider);
      const owner = await contract.owner();
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
    } else {
      alert("Wallet not found. Please install MetaMask or compatible wallet.");
    }
  };

  const distributeRewards = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, fullABI, signer);
      const tx = await contract.distributeRewards({ value: 0 });
      await tx.wait();
      alert("Rewards distributed!");
    } catch (err) {
      console.error("Distribute error:", err);
      alert("Failed to distribute rewards");
    }
  };

  const submitAndShowGameOver = async () => {
    try {
      if (!walletAddress) {
        alert("Connect wallet first to submit score!");
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, fullABI, signer);
      await contract.submitScore(score);
      alert("Score submitted! Game Over. Your score: " + score);
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Game Over! (Failed to submit score)");
    }
    window.location.reload();
  };

  const fetchLeaderboard = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider('https://node.monad.monadlabs.xyz');
      const contract = new ethers.Contract(contractAddress, fullABI, provider);
      const top = await contract.getTopPlayers();
      setLeaderboard(top);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-purple-950 via-purple-900 to-black">
      {showMenu && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white space-y-4">
          <h1 className="text-3xl font-bold">Flappy Landak</h1>
          <button onClick={() => setShowMenu(false)} className="px-6 py-3 rounded-xl bg-purple-600 font-semibold">Play</button>
          <button onClick={connectWallet} className="px-6 py-3 rounded-xl bg-purple-600 font-semibold">Connect Wallet</button>
          <button onClick={() => setShowLeaderboard(true)} className="px-6 py-3 rounded-xl bg-purple-600 font-semibold">Leaderboard</button>
          {isOwner && (
            <button onClick={distributeRewards} className="px-6 py-3 rounded-xl bg-emerald-600 font-semibold">Distribute Rewards</button>
          )}
        </div>
      )}
      <div className="absolute top-4 left-4 text-white font-medium z-20">Score: {score}</div>
      <canvas ref={canvasRef} />
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/90 text-white z-50 flex flex-col items-center justify-center px-6">
          <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
          <ol className="max-w-md w-full space-y-2">
            {leaderboard.map((player, i) => {
              const isUser = walletAddress && player.addr.toLowerCase() === walletAddress.toLowerCase();
              return (
                <li key={i} className={`text-lg ${isUser ? 'text-cyan-400 font-bold' : 'text-white'}`}>
                  {i + 1}. {player.addr.slice(0, 6)}...{player.addr.slice(-4)} - {player.score}
                </li>
              );
            })}
          </ol>
          <button onClick={() => setShowLeaderboard(false)} className="mt-6 px-6 py-3 rounded-xl bg-purple-600 font-semibold">Close</button>
        </div>
      )}
    </div>
  );
}
