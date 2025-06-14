"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { buildPoseidon } from "circomlibjs";
import type { BigNumberish } from "circomlibjs";
import { connect, getAvailableWallets } from "starknet";

export default function Home() {
  const [step, setStep] = useState<"welcome" | "connected" | "zk1" | "zk2" | "submitted">("welcome");
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

  useEffect(() => {
    const loadPoseidon = async () => {
      const poseidonInstance = await buildPoseidon();
      setPoseidon(() => poseidonInstance); // safely set it as a function
    };
    loadPoseidon();
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    try {
      const wallets = await getAvailableWallets();
      if (wallets.length === 0) {
        alert("No StarkNet wallet found. Please install Braavos or ArgentX.");
        setLoading(false);
        return;
      }
      // Prompt user to connect
      const { wallet: connectedWallet } = await connect({ modalMode: "alwaysAsk" });
      if (!connectedWallet || !connectedWallet.account) {
        alert("Wallet connection failed.");
        setLoading(false);
        return;
      }
      setWallet(connectedWallet.account.address);
      setAccount(connectedWallet.account);
      setStep("connected");
    } catch (err) {
      alert("Wallet connection failed.");
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
      // Validate required fields
      if (!form.name || isNaN(Number(form.feasibility)) || isNaN(Number(form.budget)) || isNaN(Number(form.innovation))) {
        alert("Please fill in all fields correctly.");
        setLoading(false);
        return;
      }
      // Mock IPFS upload
      if (form.attachment) {
        attachmentUrl = `ipfs://${form.attachment.name}`;
      }
      // Ensure poseidon is loaded
      if (!poseidon) {
        alert("Poseidon hash function is still loading. Try again in a second.");
        setLoading(false);
        return;
      }
      // Create hash
      hash = poseidon([
        form.name.length,
        Number(form.feasibility),
        Number(form.budget),
        Number(form.innovation)
      ]).toString();
      // Send to webhook
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
          attachmentUrl, // mocked or real IPFS
          hash, // Poseidon hash
          wallet,
          step,
          timestamp: new Date().toISOString()
        }),
      });
      setStep("submitted");
      setLoading(false);
    } catch (err) {
      console.error("Error during submission:", err);
      alert("Something went wrong. Check the console for details.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.10)" }}>
      <div className="w-full max-w-md bg-white shadow-lg p-8 flex flex-col gap-6" style={{ borderRadius: 12 }}>
        {step === "welcome" && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "rgba(0,0,0,0.7)" }}>
              Welcome to the zkTender!
            </h1>
            <p className="text-center mb-4" style={{ color: "rgba(0,0,0,0.7)" }}>
              You are about to start your proposal. Please be sure you have a Braavos or Argent wallet.
            </p>
            <button
              className="w-full py-2 px-4 font-semibold transition"
              style={{ background: "rgba(0,0,0,0.8)", color: "#fff", borderRadius: 8 }}
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          </>
        )}
        {step === "connected" && (
          <>
            <div className="font-semibold text-center mb-2" style={{ color: "rgba(0,0,0,0.7)" }}>
              Success! Wallet connected.
            </div>
            <div className="flex gap-4 justify-center">
              <button
                className="py-2 px-4 transition"
                style={{ background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 8 }}
                onClick={() => setStep("zk1")}
              >
                zk1
              </button>
              <button
                className="py-2 px-4 transition"
                style={{ background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 8 }}
                onClick={() => setStep("zk2")}
              >
                zk2
              </button>
            </div>
          </>
        )}
        {(step === "zk1" || step === "zk2") && (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold mb-2" style={{ color: "rgba(0,0,0,0.7)" }}>
              Submit Proposal ({step.toUpperCase()})
            </h2>
            <input
              className="border px-3 py-2"
              style={{ borderRadius: 8, color: "rgba(0,0,0,0.7)" }}
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              className="border px-3 py-2"
              style={{ borderRadius: 8, color: "rgba(0,0,0,0.7)" }}
              name="feasibility"
              placeholder="Feasibility Score (0-10)"
              type="number"
              min="0"
              max="10"
              value={form.feasibility}
              onChange={handleChange}
              required
            />
            <input
              className="border px-3 py-2"
              style={{ borderRadius: 8, color: "rgba(0,0,0,0.7)" }}
              name="budget"
              placeholder="Budget Estimate (USD)"
              type="number"
              min="0"
              value={form.budget}
              onChange={handleChange}
              required
            />
            <input
              className="border px-3 py-2"
              style={{ borderRadius: 8, color: "rgba(0,0,0,0.7)" }}
              name="innovation"
              placeholder="Innovation Rating (0-10)"
              type="number"
              min="0"
              max="10"
              value={form.innovation}
              onChange={handleChange}
              required
            />
            <input
              className="border px-3 py-2"
              style={{ borderRadius: 8, color: "rgba(0,0,0,0.7)" }}
              name="attachment"
              type="file"
              accept="*"
              onChange={handleChange}
            />
            <button
              className="w-full py-2 px-4 font-semibold transition mt-2"
              style={{ background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 8 }}
              type="submit"
              disabled={loading || !poseidon}
            >
              {loading ? "Submitting..." : "Submit Proposal"}
            </button>
          </form>
        )}
        {step === "submitted" && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl" style={{ color: "rgba(0,0,0,0.7)" }}>
              Submitted securely ✔️
            </div>
            <button
              className="mt-4 px-4 py-2 transition"
              style={{ background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 8 }}
              onClick={() => setStep("welcome")}
            >
              Submit another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
