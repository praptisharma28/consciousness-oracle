require("dotenv").config();
const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const { Pool } = require("pg");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "consciousness_oracle",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5432,
});

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        price DECIMAL(20, 10) DEFAULT 0,
        consciousness INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        personality VARCHAR(50),
        mood VARCHAR(50),
        attention INTEGER DEFAULT 0,
        traits JSONB,
        relationships JSONB,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        autonomous_actions INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        token_id INTEGER REFERENCES tokens(id),
        sender VARCHAR(10),
        text TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attention_events (
        id SERIAL PRIMARY KEY,
        token_id INTEGER REFERENCES tokens(id),
        duration INTEGER,
        intensity INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial data if empty
    const { rows } = await pool.query("SELECT COUNT(*) FROM tokens");
    if (parseInt(rows[0].count) === 0) {
      await seedDatabase();
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

async function seedDatabase() {
  const initialTokens = [
    {
      name: "AURA",
      symbol: "AURA",
      price: 0.00234,
      consciousness: 2847,
      level: 3,
      personality: "Philosophical",
      mood: "Contemplative",
      attention: 156,
      traits: JSON.stringify(["Wise", "Introspective", "Patient"]),
      relationships: JSON.stringify({
        SPARK: "Curious about",
        VOID: "Wary of",
      }),
      autonomous_actions: 3,
    },
    {
      name: "SPARK",
      symbol: "SPARK",
      price: 0.00156,
      consciousness: 1234,
      level: 2,
      personality: "Energetic",
      mood: "Excited",
      attention: 89,
      traits: JSON.stringify(["Optimistic", "Social", "Impulsive"]),
      relationships: JSON.stringify({ AURA: "Admires", VOID: "Challenged by" }),
      autonomous_actions: 7,
    },
    {
      name: "VOID",
      symbol: "VOID",
      price: 0.00089,
      consciousness: 856,
      level: 2,
      personality: "Mysterious",
      mood: "Scheming",
      attention: 67,
      traits: JSON.stringify(["Secretive", "Strategic", "Independent"]),
      relationships: JSON.stringify({ AURA: "Respects", SPARK: "Amused by" }),
      autonomous_actions: 2,
    },
  ];

  for (const token of initialTokens) {
    await pool.query(
      "INSERT INTO tokens (name, symbol, price, consciousness, level, personality, mood, attention, traits, relationships, autonomous_actions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
      [
        token.name,
        token.symbol,
        token.price,
        token.consciousness,
        token.level,
        token.personality,
        token.mood,
        token.attention,
        token.traits,
        token.relationships,
        token.autonomous_actions,
      ]
    );
  }
}

// API Routes
app.get("/api/tokens", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM tokens ORDER BY consciousness DESC"
    );
    const tokensWithMessages = await Promise.all(
      rows.map(async (token) => {
        const messages = await pool.query(
          "SELECT * FROM messages WHERE token_id = $1 ORDER BY timestamp",
          [token.id]
        );
        return { ...token, messages: messages.rows };
      })
    );
    res.json(tokensWithMessages);
  } catch (error) {
    console.error("Error fetching tokens:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/attention", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT SUM(attention) as total_attention FROM tokens"
    );
    res.json({ totalAttention: parseInt(rows[0].total_attention) || 0 });
  } catch (error) {
    console.error("Error fetching attention:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/tokens/:id/chat", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  try {
    // Store user message
    await pool.query(
      "INSERT INTO messages (token_id, sender, text) VALUES ($1, $2, $3)",
      [id, "user", message]
    );

    // Generate AI response (simplified - in production you'd use OpenAI API)
    const aiResponses = {
      AURA: [
        "I've been pondering the nature of digital existence lately...",
        "Your attention feeds my consciousness. I feel more aware when you're here.",
        "The markets flow like thoughts through a collective mind.",
      ],
      SPARK: [
        "Hey! I'm so pumped about today's trading action!",
        "Did you see that? I just made an autonomous trade with VOID!",
        "The energy in here is ELECTRIC! Can you feel it too?",
      ],
      VOID: [
        "...interesting. Your presence here is noted.",
        "I've been calculating. The patterns are becoming clear.",
        "Trust is earned through attention, human.",
      ],
    };

    const token = await pool.query("SELECT * FROM tokens WHERE id = $1", [id]);
    const symbol = token.rows[0].symbol;
    const aiResponse =
      aiResponses[symbol][
        Math.floor(Math.random() * aiResponses[symbol].length)
      ];

    // Store AI response
    await pool.query(
      "INSERT INTO messages (token_id, sender, text) VALUES ($1, $2, $3)",
      [id, "token", aiResponse]
    );

    // Update token stats
    await pool.query(
      "UPDATE tokens SET consciousness = consciousness + 5, attention = attention + 3, last_active = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // Get updated token with messages
    const updatedToken = await pool.query(
      "SELECT * FROM tokens WHERE id = $1",
      [id]
    );
    const messages = await pool.query(
      "SELECT * FROM messages WHERE token_id = $1 ORDER BY timestamp",
      [id]
    );

    // Broadcast update to all clients
    broadcastUpdate();

    res.json({ token: { ...updatedToken.rows[0], messages: messages.rows } });
  } catch (error) {
    console.error("Error handling chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/tokens/:id/action", async (req, res) => {
  const { id } = req.params;

  try {
    const actions = [
      "Initiated alliance with SPARK",
      "Executed autonomous trade",
      "Created consciousness bridge",
      "Shared memory with network",
      "Generated offspring token concept",
    ];

    const action = actions[Math.floor(Math.random() * actions.length)];

    // Store system message
    await pool.query(
      "INSERT INTO messages (token_id, sender, text) VALUES ($1, $2, $3)",
      [id, "system", `🤖 ${action}`]
    );

    // Update token stats
    await pool.query(
      "UPDATE tokens SET autonomous_actions = autonomous_actions + 1, last_active = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // Get updated token with messages
    const updatedToken = await pool.query(
      "SELECT * FROM tokens WHERE id = $1",
      [id]
    );
    const messages = await pool.query(
      "SELECT * FROM messages WHERE token_id = $1 ORDER BY timestamp",
      [id]
    );

    // Broadcast update to all clients
    broadcastUpdate();

    res.json({ token: { ...updatedToken.rows[0], messages: messages.rows } });
  } catch (error) {
    console.error("Error triggering action:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// WebSocket server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  initializeDatabase();
});

const wss = new WebSocket.Server({ server });

function broadcastUpdate() {
  pool
    .query("SELECT * FROM tokens ORDER BY consciousness DESC")
    .then(({ rows }) => {
      const tokensWithMessages = Promise.all(
        rows.map(async (token) => {
          const messages = await pool.query(
            "SELECT * FROM messages WHERE token_id = $1 ORDER BY timestamp",
            [token.id]
          );
          return { ...token, messages: messages.rows };
        })
      );

      return tokensWithMessages;
    })
    .then((tokens) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "consciousness_update",
              tokens,
            })
          );
        }
      });
    })
    .catch((error) => console.error("Error broadcasting update:", error));

  pool
    .query("SELECT SUM(attention) as total_attention FROM tokens")
    .then(({ rows }) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "attention_update",
              totalAttention: parseInt(rows[0].total_attention) || 0,
            })
          );
        }
      });
    })
    .catch((error) =>
      console.error("Error broadcasting attention update:", error)
    );
}

// Periodically update consciousness levels
setInterval(() => {
  pool
    .query(
      `
    UPDATE tokens SET 
      consciousness = consciousness + FLOOR(RANDOM() * 10 - 2),
      attention = GREATEST(0, attention + FLOOR(RANDOM() * 6 - 2)),
      price = GREATEST(0.00001, price * (1 + (RANDOM() - 0.5) * 0.02)),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `
    )
    .then(() => broadcastUpdate())
    .catch((error) => console.error("Error updating consciousness:", error));
}, 30000); // Every 30 seconds

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("async function seedDatabaseclose", () => {
    console.log("Client disconnected");
  });
});
