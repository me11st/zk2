"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { buildPoseidon } from "circomlibjs";
import type { BigNumberish } from "circomlibjs";

export default function Home() {
  const [step, setStep] = useState<"welcome" | "connected" | "zk1" | "zk2" | "submitted">("welcome");
  const [wallet, setWallet] = useState<string | null>(null);
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
    setTimeout(() => {
      setWallet("0xDEADBEEF");
      setStep("connected");
      setLoading(false);
    }, 1000);
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

    try {
      if (
        !form.name ||
        isNaN(Number(form.feasibility)) ||
        isNaN(Number(form.budget)) ||
        isNaN(Number(form.innovation))
      ) {
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

      const input = [
        form.name.length,
        Number(form.feasibility),
        Number(form.budget),
        Number(form.innovation),
      ];

      const hash = poseidon(input).toString();

      const calldata = { hash, attachmentUrl };

      setTimeout(() => {
        setStep("submitted");
        setLoading(false);
      }, 1200);
    } catch (err) {
      console.error("Error during submission:", err);
      alert("Something went wrong. Check the console for details.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 flex flex-col gap-6">
        {step === "welcome" && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Welcome to the zkTender!</h1>
            <p className="text-center text-gray-600 mb-4">
              You are about to start your proposal. Please be sure you have a Braavos or Argent wallet.
            </p>
            <button
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          </>
        )}
        {step === "connected" && (
          <>
            <div className="text-green-600 font-semibold text-center mb-2">Success! Wallet connected.</div>
            <div className="flex gap-4 justify-center">
              <button
                className="py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={() => setStep("zk1")}
              >
                zk1
              </button>
              <button
                className="py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                onClick={() => setStep("zk2")}
              >
                zk2
              </button>
            </div>
          </>
        )}
        {(step === "zk1" || step === "zk2") && (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold mb-2">Submit Proposal ({step.toUpperCase()})</h2>
            <input
              className="border rounded px-3 py-2"
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              className="border rounded px-3 py-2"
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
              className="border rounded px-3 py-2"
              name="budget"
              placeholder="Budget Estimate (USD)"
              type="number"
              min="0"
              value={form.budget}
              onChange={handleChange}
              required
            />
            <input
              className="border rounded px-3 py-2"
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
              className="border rounded px-3 py-2"
              name="attachment"
              type="file"
              accept="*"
              onChange={handleChange}
            />
            <button
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition mt-2"
              type="submit"
              disabled={loading || !poseidon}
            >
              {loading ? "Submitting..." : "Submit Proposal"}
            </button>
          </form>
        )}
        {step === "submitted" && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl text-green-600">Submitted securely ✔️</div>
            <button
              className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
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
