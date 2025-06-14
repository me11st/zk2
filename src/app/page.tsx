"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { buildPoseidon } from "circomlibjs";
import type { BigNumberish } from "circomlibjs";
import { connect } from "@argent/get-starknet";
import { RpcProvider } from "starknet";

// Initialize a provider for Sepolia testnet
const sepoliaProvider = new RpcProvider({ nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_6" });

// Replace with your mock ERC20 contract address
const MOCK_ERC20_ADDRESS =
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export default function Home() {
  const [step, setStep] = useState<"welcome" | "connected" | "zk1" | "zk2" | "zk3" | "submitted">("welcome");
  const [wallet, setWallet] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null); // for real wallet account
  const [form, setForm] = useState({
    name: "",
    feasibility: "",
    budget: "",
    innovation: "",
    attachment: null as File | null,
    attachmentUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [poseidon, setPoseidon] = useState<((inputs: BigNumberish[]) => bigint) | null>(null);

  // Add state for proposal visibility and submission deadline
  const [proposalsVisible, setProposalsVisible] = useState(false);
  const SUBMISSION_DEADLINE = new Date('2025-07-01T00:00:00Z'); // Example deadline

  useEffect(() => {
    const loadPoseidon = async () => {
      const poseidonInstance = await buildPoseidon();
      const poseidonHash = (inputs: BigNumberish[]) => {
        if (!Array.isArray(inputs) || inputs.length === 0) {
          throw new Error("Poseidon inputs must be a non-empty array.");
        }

        try {
          const result = poseidonInstance(inputs);
          return poseidonInstance.F.toObject(result) as bigint;
        } catch (err) {
          console.error("Poseidon hash failed:", err);
          return BigInt(0); // fallback
        }
      };

      setPoseidon(() => poseidonHash);
    };
    loadPoseidon();
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    try {
      const connection = await connect({ modalMode: "alwaysAsk" });

      if (!connection) {
        throw new Error("No wallet connection returned");
      }

      await connection.enable(); // Prompt Braavos to connect (important!)

      const address = connection.selectedAddress;
      const account = connection.account;

      if (!connection.isConnected || !account || !address) {
        throw new Error("Wallet is not fully connected");
      }

      setWallet(address);
      setAccount(account);
      setStep("connected");
    } catch (err) {
      console.error("Wallet connect error:", err);
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.includes('cancelled')) {
        alert("Connection was cancelled. Please try again.");
      } else {
        alert("Wallet connection failed or was cancelled.");
      }
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    if (name === "attachment" && files && files[0]) {
      setForm((f) => ({ ...f, attachment: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let attachmentUrl = "";
    let hash = "";
    try {
      if (!form.name || isNaN(Number(form.feasibility)) || isNaN(Number(form.budget)) || isNaN(Number(form.innovation))) {
        alert("Please fill in all fields correctly.");
        setLoading(false);
        return;
      }

      if (form.attachment) {
        attachmentUrl = `ipfs://${form.attachment.name}`;
      }

      if (!poseidon) {
        alert("Poseidon hash function is still loading. Try again in a second.");
        setLoading(false);
        return;
      }

      hash = poseidon([
        form.name.length,
        Number(form.feasibility),
        Number(form.budget),
        Number(form.innovation)
      ]).toString();

      // Try to POST to the real endpoint, but mock success if it fails
      try {
        await fetch("https://kisse.app.n8n.cloud/webhook-test/webhook/zk-tender-submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            feasibility: Number(form.feasibility),
            budget: Number(form.budget),
            innovation: Number(form.innovation),
            attachmentUrl,
            hash,
            wallet,
            step,
            timestamp: new Date().toISOString()
          }),
        });
      } catch (e) {
        // Mock: treat as success for local/dev
        console.warn("Submission failed, mocking success for local dev.", e);
      }
      setStep("submitted");
    } catch (err) {
      console.error("Error during submission:", err);
      alert("Something went wrong. Check the console for details.");
    }
    setLoading(false);
  };

  const checkBalanceAndSubmit = async () => {
    try {
      if (!account) {
        alert("Wallet not connected.");
        return;
      }

      // Remove or comment out the real Sepolia provider balance check
      // const ETH_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000000";
      // const balance = await sepoliaProvider.getBalance(account.address, ETH_ADDRESS);

      // if (BigInt(balance.balance) === BigInt(0)) {
      //   alert("⚠️ You don't have any Sepolia ETH. Please top up your StarkNet wallet.");
      //   return;
      // }

      // continue with transaction logic here
    } catch (err: any) {
      console.error("Error checking balance or submitting transaction:", err);
      alert("Something went wrong. Check the console for details.");
    }
  };

  // Replace the real balance check with a mock
  async function fetchMockERC20Balance(_walletAddress: string) {
    // Always return 1000 tokens for demo
    return 1000;
  }

  useEffect(() => {
    const checkBalance = async () => {
      if (!account) return;
      try {
        // const ETH_ADDRESS = "0x049d36570d4e46e6dd3a78d6e21b2c6b6c38c2c0a0c47e4fc1c7aab5d5c0b8f8";
        // const call = {
        //   contractAddress: ETH_ADDRESS,
        //   entrypoint: "balanceOf",
        //   calldata: [account.address],
        // };
        // const result = await sepoliaProvider.callContract(call);
        // const balance = BigInt(result[0]);
        // if (balance === BigInt(0)) {
        //   alert("⚠️ You don't have any Sepolia ETH. Please top up your StarkNet wallet before submitting a proposal.");
        // }
      } catch (err) {
        console.error("Error checking balance after wallet connect:", err);
      }
    };
    checkBalance();
  }, [account]);

  // In your React component, replace the real balance check logic:
  const [balance, setBalance] = useState(0);
  const [balanceWarning, setBalanceWarning] = useState(false);

  useEffect(() => {
    if (wallet) {
      fetchMockERC20Balance(wallet).then((bal) => {
        setBalance(bal);
        setBalanceWarning(bal === 0);
      });
    }
  }, [wallet]);

  // MOCK: Remove all real provider/sepoliaProvider/callContract logic for balance
  // Instead, always set a mock balance and skip any contract call
  useEffect(() => {
    if (wallet) {
      // Always set a mock balance for demo
      setBalance(1000);
      setBalanceWarning(false); // No warning, always has balance
    }
  }, [wallet]);

  // On mount or interval, check if deadline has passed
  useEffect(() => {
    const checkDeadline = () => {
      if (new Date() >= SUBMISSION_DEADLINE) {
        setProposalsVisible(true);
      } else {
        setProposalsVisible(false);
      }
    };
    checkDeadline();
    const interval = setInterval(checkDeadline, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#4D4D4D" }}>
      <div className="w-full max-w-md" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-8 flex flex-col gap-6">
          {step === "welcome" && (
            <>
              <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "#4D4D4D" }}>
                Welcome to the zkTender!
              </h1>
              <p className="text-center mb-4" style={{ color: "#4D4D4D" }}>
                You are about to start your proposal. Please be sure you have a Braavos or Argent wallet.
              </p>
              <button
                className="w-full py-2 px-4 font-semibold transition"
                style={{ background: "#4D4D4D", color: "#fff", borderRadius: 8 }}
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            </>
          )}
          {step === "connected" && (
            <>
              <div className="font-semibold text-center mb-2" style={{ color: "#4D4D4D" }}>
                Success! Wallet connected.
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  className="py-2 px-4 transition"
                  style={{ background: "#4D4D4D", color: "#fff", borderRadius: 8 }}
                  onClick={() => setStep("zk2")}
                >
                  zk2
                </button>
                <button
                  className="py-2 px-4 transition"
                  style={{ background: "#4D4D4D", color: "#fff", borderRadius: 8 }}
                  onClick={() => setStep("zk3")}
                >
                  zk3
                </button>
              </div>
            </>
          )}
          {(step === "zk1" || step === "zk2" || step === "zk3") && (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#4D4D4D" }}>
                Submit Proposal ({step.toUpperCase()})
              </h2>
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="name"
                placeholder="Name *"
                value={form.name}
                onChange={handleChange}
                required
              />
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="feasibility"
                placeholder="Feasibility Score (0-99) *"
                type="number"
                min="0"
                max="99"
                value={form.feasibility}
                onChange={handleChange}
                required
              />
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="budget"
                placeholder="Budget Estimate (USD) *"
                type="number"
                min="0"
                max="99999999"
                value={form.budget}
                onChange={handleChange}
                required
              />
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="innovation"
                placeholder="Innovation Rating (0-99) *"
                type="number"
                min="0"
                max="99"
                value={form.innovation}
                onChange={handleChange}
                required
              />
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="attachment"
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleChange}
              />
              <button
                className="w-full py-2 px-4 font-semibold transition mt-2"
                style={{ background: "#4D4D4D", color: "#fff", borderRadius: 8 }}
                type="submit"
                disabled={loading || !poseidon}
              >
                {loading ? "Submitting..." : "Submit Proposal"}
              </button>
            </form>
          )}
          {step === "submitted" && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl text-center" style={{ color: "#4D4D4D" }}>
                ✅ Proposal Submitted!
              </div>
              <p className="text-sm text-center" style={{ color: "#4D4D4D", opacity: 0.7 }}>
                Thank you for participating in zkTender. Your submission has been recorded.
              </p>
            </div>
          )}
          {balanceWarning && (
            <div className="text-red-500 text-sm text-center">
              ⚠️ Your balance is low. Please ensure you have enough tokens for the transaction.
            </div>
          )}
          {!proposalsVisible ? (
            <div className="text-center" style={{ color: "#4D4D4D", opacity: 0.5, marginTop: 32 }}>
              Proposals are hidden until the submission deadline for privacy. Please check back after {SUBMISSION_DEADLINE.toLocaleString()}.
            </div>
          ) : (
            <div className="text-center" style={{ color: "#4D4D4D", marginTop: 32 }}>
              {/* Example: After the deadline, proposals would be listed here. */}
              <div className="font-bold">Proposals Revealed!</div>
              <div className="italic">(This is a placeholder. Integrate your proposal list here.)</div>
            </div>
          )}
        </div>
      </div>
      {/* White square button for public voting */}
      <a
        href="/public-vote"
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 1000,
          background: '#fff',
          color: '#4D4D4D',
          borderRadius: 8,
          width: 220,
          height: 64,
          fontSize: 16,
          fontWeight: 'bold',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '2px solid #eee',
          textDecoration: 'none',
          transition: 'box-shadow 0.2s',
        }}
        title="Check zk1 for public voting"
      >
        Check zk1 for public voting
      </a>
    </div>
  );
}
