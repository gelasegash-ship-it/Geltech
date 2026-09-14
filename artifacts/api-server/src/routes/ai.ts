import { Router } from "express";
import OpenAI from "openai";

const router = Router();

function getOpenAIClient(): OpenAI | null {
  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!baseURL || !apiKey) return null;
  return new OpenAI({ baseURL, apiKey });
}

// ─── Chat (streaming SSE) ─────────────────────────────────────────────────────

router.post("/ai/chat", async (req, res) => {
  const { messages, systemPrompt, turbo } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    systemPrompt?: string;
    turbo?: boolean;
  };

  const openai = getOpenAIClient();
  if (!openai) {
    res.status(503).json({ error: "AI not configured", message: "Activez l'intégration IA Replit." });
    return;
  }

  const sysContent = (systemPrompt ||
    `You are WealthAI, a brilliant personal financial advisor. Respond in French.`)
    + (turbo ? "\n\nIMPORTANT: Reply in 2-3 sentences MAXIMUM. Be razor-sharp and ultra-concise. No preamble." : "");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: turbo ? 300 : 8192,
      messages: [{ role: "system", content: sysContent }, ...messages],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "AI chat error");
    res.write(`data: ${JSON.stringify({ error: "Erreur IA" })}\n\n`);
    res.end();
  }
});

// ─── Suggestions (follow-up questions) ───────────────────────────────────────

router.post("/ai/suggestions", async (req, res) => {
  const { lastUserMsg, lastAIMsg } = req.body as {
    lastUserMsg: string;
    lastAIMsg: string;
  };

  const openai = getOpenAIClient();
  if (!openai) { res.json({ suggestions: [] }); return; }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 200,
      messages: [
        { role: "system", content: "You are a financial advisor. Generate 3 extremely short follow-up questions in French (max 8 words each) that the user might want to ask. Return ONLY a JSON array of strings, no markdown." },
        { role: "user", content: `User asked: "${lastUserMsg}"\nAI replied: "${lastAIMsg.substring(0, 200)}"\nGenerate 3 follow-up questions.` },
      ],
    });
    const text = response.choices[0]?.message?.content || "[]";
    let suggestions: string[];
    try { suggestions = JSON.parse(text); }
    catch { const m = text.match(/\[[\s\S]*\]/); suggestions = m ? JSON.parse(m[0]) : []; }
    res.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    req.log.error({ err }, "AI suggestions error");
    res.json({ suggestions: [] });
  }
});

// ─── Ideas ────────────────────────────────────────────────────────────────────

router.post("/ai/ideas", async (req, res) => {
  const { context } = req.body as {
    context?: { netWorth?: number; monthlyIncome?: number; monthlySavings?: number };
  };

  const openai = getOpenAIClient();
  if (!openai) { res.status(503).json({ error: "AI not configured" }); return; }

  try {
    const prompt = `Generate 6 actionable passive income ideas for someone with:
- Net worth: €${context?.netWorth?.toLocaleString() ?? "?"}
- Monthly income: €${context?.monthlyIncome?.toLocaleString() ?? "?"}
- Monthly savings: €${context?.monthlySavings?.toLocaleString() ?? "?"}

Return ONLY JSON array:
[{ "id": "1", "title": "Short title (max 5 words)", "category": "Investment|Digital|Real Estate|Service|Content|Other",
"potential": "€X - €Y/mois", "difficulty": "Facile|Moyen|Difficile", "timeToStart": "X jours/semaines/mois",
"description": "2-3 sentence description with specific steps.", "steps": ["Step 1", "Step 2", "Step 3"] }]`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: "Wealth-building expert. ONLY valid JSON arrays, no markdown." },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content || "[]";
    let ideas;
    try { ideas = JSON.parse(content); }
    catch { const m = content.match(/\[[\s\S]*\]/); ideas = m ? JSON.parse(m[0]) : []; }
    res.json({ ideas });
  } catch (err) {
    req.log.error({ err }, "AI ideas error");
    res.status(500).json({ error: "Failed to generate ideas" });
  }
});

// ─── Analyze ──────────────────────────────────────────────────────────────────

router.post("/ai/analyze", async (req, res) => {
  const { portfolio, budget } = req.body as {
    portfolio?: { symbol: string; value: number; gainPercent: number }[];
    budget?: { income: number; expenses: number; savings: number };
  };

  const openai = getOpenAIClient();
  if (!openai) {
    res.json({ insights: [{ type: "info", title: "IA non activée", message: "Activez les intégrations IA Replit." }] });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: "Wealth advisor. Respond ONLY with valid JSON, no markdown." },
        { role: "user", content: `Analyze: Portfolio: ${JSON.stringify(portfolio || [])} Budget: Income €${budget?.income || 0}, Expenses €${budget?.expenses || 0}, Savings €${budget?.savings || 0}. Return { "insights": [{ "type": "success|warning|info|danger", "title": "Short title", "message": "1-2 sentences in French" }] } with 3 insights.` },
      ],
    });
    const content = response.choices[0]?.message?.content || "{}";
    let result;
    try { result = JSON.parse(content); }
    catch { const m = content.match(/\{[\s\S]*\}/); result = m ? JSON.parse(m[0]) : { insights: [] }; }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "AI analyze error");
    res.status(500).json({ error: "Failed to analyze" });
  }
});

// ─── Plan (Pilote Auto) ────────────────────────────────────────────────────────

router.post("/ai/plan", async (req, res) => {
  const { financialData } = req.body as {
    financialData: {
      netWorth: number; monthlyIncome: number; monthlyExpenses: number; monthlySavings: number;
      investments: { symbol: string; name: string; value: number; gainPercent: number; category: string }[];
      bankAccounts: { bankName: string; accountType: string; balance: number; currency: string }[];
      savingsGoals: { name: string; target: number; current: number; progressPct: number }[];
      totalBankBalance: number;
    };
  };

  const openai = getOpenAIClient();
  if (!openai) {
    res.json({ planTitle: "Plan Financier IA", summary: "Activez les intégrations IA Replit.", actions: [] });
    return;
  }

  const fd = financialData;
  const month = new Date().toLocaleString("fr-FR", { month: "long", year: "numeric" });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: "Elite wealth manager AI. Respond ONLY with valid JSON, no markdown." },
        { role: "user", content: `Analyze this client and create an executable monthly plan in French.
CLIENT — ${month}: Net worth €${fd.netWorth.toLocaleString()}, Income €${fd.monthlyIncome}/month, Expenses €${fd.monthlyExpenses}/month, Savings €${fd.monthlySavings}/month, Bank total €${fd.totalBankBalance}, Investments: ${JSON.stringify(fd.investments)}, Goals: ${JSON.stringify(fd.savingsGoals)}, Accounts: ${JSON.stringify(fd.bankAccounts)}

Return JSON: { "planTitle": "Plan — ${month}", "summary": "2-3 sentence executive summary", "healthScore": 72, "healthLabel": "Bon", "actions": [{ "id": "1", "type": "invest|save|reduce_expense|rebalance|emergency|transfer", "priority": "critical|high|medium|low", "title": "max 6 words", "description": "1-2 sentences", "amount": 500, "currency": "EUR", "target": "goal", "impact": "Expected impact", "category": null, "goalName": null }], "monthlySplit": { "invest": 40, "save": 30, "reserve": 20, "enjoy": 10 } }

Generate 4-6 specific actions totaling ≤€${fd.monthlySavings}. All text in French.` },
      ],
    });
    const content = response.choices[0]?.message?.content || "{}";
    let plan;
    try { plan = JSON.parse(content); }
    catch { const m = content.match(/\{[\s\S]*\}/); plan = m ? JSON.parse(m[0]) : { planTitle: "Plan", summary: "Erreur", actions: [] }; }
    res.json(plan);
  } catch (err) {
    req.log.error({ err }, "AI plan error");
    res.status(500).json({ error: "Failed to generate plan" });
  }
});

export default router;
