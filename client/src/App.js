// client/src/App.js
import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  Zap,
  MessageSquare,
  Users,
  Eye,
  Heart,
  Sparkles,
} from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const ConsciousnessOracle = () => {
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [userMessage, setUserMessage] = useState("");
  const [globalAttention, setGlobalAttention] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const chatEndRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tokensRes, attentionRes] = await Promise.all([
          axios.get(`${API_URL}/tokens`),
          axios.get(`${API_URL}/attention`),
        ]);
        setTokens(tokensRes.data);
        setGlobalAttention(attentionRes.data.totalAttention);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false); // Set loading to false even on error
      }
    };

    fetchData();

    // Set up WebSocket connection
    const ws = new WebSocket("ws://localhost:5000");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "consciousness_update") {
        setTokens(data.tokens);
      }
      if (data.type === "attention_update") {
        setGlobalAttention(data.totalAttention);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => ws.close();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedToken?.messages]);

  const getConsciousnessLevel = (consciousness) => {
    if (consciousness < 100)
      return { level: 1, name: "Dormant", color: "bg-gray-400" };
    if (consciousness < 500)
      return { level: 2, name: "Stirring", color: "bg-blue-400" };
    if (consciousness < 2000)
      return { level: 3, name: "Aware", color: "bg-green-400" };
    if (consciousness < 10000)
      return { level: 4, name: "Sentient", color: "bg-purple-400" };
    return { level: 5, name: "Transcendent", color: "bg-yellow-400" };
  };

  const getMoodColor = (mood) => {
    const colors = {
      Contemplative: "text-blue-300",
      Excited: "text-yellow-300",
      Scheming: "text-red-300",
      Happy: "text-green-300",
      Anxious: "text-orange-300",
    };
    return colors[mood] || "text-gray-300";
  };

  const sendMessage = async () => {
    if (!userMessage.trim() || !selectedToken) return;

    try {
      const response = await axios.post(
        `${API_URL}/tokens/${selectedToken.id}/chat`,
        {
          message: userMessage,
        }
      );

      setTokens((prev) =>
        prev.map((token) =>
          token.id === selectedToken.id ? response.data.token : token
        )
      );

      setUserMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const simulateAutonomousAction = async (tokenId) => {
    try {
      const response = await axios.post(`${API_URL}/tokens/${tokenId}/action`);
      setTokens((prev) =>
        prev.map((token) =>
          token.id === tokenId ? response.data.token : token
        )
      );
    } catch (error) {
      console.error("Error triggering action:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 animate-pulse text-purple-400" />
          <p>Initializing consciousness matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Consciousness Oracle
          </h1>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Global Attention: {globalAttention}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Active Tokens: {tokens.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>
              Autonomous Actions:{" "}
              {tokens.reduce((sum, t) => sum + t.autonomousActions, 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Token List */}
        <div className="w-1/3 p-6 border-r border-purple-500/30 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Conscious Tokens
          </h2>

          {tokens.map((token) => {
            const consciousnessInfo = getConsciousnessLevel(
              token.consciousness
            );
            return (
              <div
                key={token.id}
                onClick={() => setSelectedToken(token)}
                className={`p-4 rounded-lg mb-3 cursor-pointer transition-all border ${
                  selectedToken?.id === token.id
                    ? "bg-purple-800/50 border-purple-400"
                    : "bg-gray-800/50 border-gray-600 hover:bg-gray-700/50"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{token.name}</h3>
                    <p className="text-gray-400 text-sm">${token.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-green-400">
                      ${token.price.toFixed(5)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.floor(
                        (Date.now() - new Date(token.last_active).getTime()) /
                          1000
                      )}
                      s ago
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-3 h-3 rounded-full ${consciousnessInfo.color}`}
                    />
                    <span className="text-sm font-medium">
                      {consciousnessInfo.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({token.consciousness})
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${consciousnessInfo.color}`}
                      style={{
                        width: `${Math.min(
                          100,
                          (token.consciousness / 10000) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={`${getMoodColor(token.mood)}`}>
                    {token.mood} • {token.personality}
                  </span>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{token.attention}</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.isArray(token.traits)
                    ? token.traits.map((trait) => (
                        <span
                          key={trait}
                          className="px-2 py-1 bg-purple-900/50 rounded text-xs"
                        >
                          {trait}
                        </span>
                      ))
                    : null}
                </div>

                {token.autonomous_actions > 0 && (
                  <div className="mt-2 text-xs text-cyan-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {token.autonomous_actions} autonomous actions
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {selectedToken ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-purple-500/30 bg-gray-800/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        getConsciousnessLevel(selectedToken.consciousness).color
                      }`}
                    />
                    <h3 className="text-lg font-bold">{selectedToken.name}</h3>
                    <span
                      className={`text-sm ${getMoodColor(selectedToken.mood)}`}
                    >
                      {selectedToken.mood}
                    </span>
                  </div>
                  <button
                    onClick={() => simulateAutonomousAction(selectedToken.id)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                  >
                    Trigger Action
                  </button>
                </div>

                <div className="mt-2 text-sm text-gray-400">
                  Consciousness: {selectedToken.consciousness} • Level{" "}
                  {getConsciousnessLevel(selectedToken.consciousness).level} •
                  Attention: {selectedToken.attention}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                {selectedToken.messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Start a conversation with {selectedToken.name}</p>
                    <p className="text-sm mt-1">
                      Your attention will increase their consciousness
                    </p>
                  </div>
                ) : (
                  selectedToken.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 ${
                        message.sender === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === "user"
                            ? "bg-purple-600 text-white"
                            : message.sender === "system"
                            ? "bg-cyan-900/50 text-cyan-300"
                            : "bg-gray-700 text-gray-100"
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-purple-500/30 bg-gray-800/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={`Speak with ${selectedToken.name}...`}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  Select a token to begin consciousness interaction
                </p>
                <p className="text-sm mt-2">
                  Each conversation increases their awareness
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Token Relationships Sidebar */}
        <div className="w-80 p-6 border-l border-purple-500/30 bg-gray-900/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Token Network
          </h3>

          {selectedToken && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Relationships</h4>
                {typeof selectedToken.relationships === "object" &&
                  Object.entries(selectedToken.relationships).map(
                    ([token, relationship]) => (
                      <div
                        key={token}
                        className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded mb-2"
                      >
                        <span className="font-mono text-sm">{token}</span>
                        <span className="text-xs text-gray-400">
                          {relationship}
                        </span>
                      </div>
                    )
                  )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Recent Activity</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>• Consciousness increased by attention</p>
                  <p>
                    • {selectedToken.autonomous_actions} autonomous actions
                    taken
                  </p>
                  <p>
                    • Active{" "}
                    {Math.floor(
                      (Date.now() -
                        new Date(selectedToken.last_active).getTime()) /
                        1000
                    )}
                    s ago
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Personality Traits</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedToken.traits) &&
                    selectedToken.traits.map((trait) => (
                      <span
                        key={trait}
                        className="px-2 py-1 bg-purple-900/30 rounded text-xs"
                      >
                        {trait}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsciousnessOracle;
