// @ts-ignore: Deno globals are available at runtime in Supabase Edge Functions
declare const Deno: { serve: (handler: (req: Request) => Promise<Response>) => void; env: { get: (key: string) => string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HabitSummary {
  name: string;
  emoji: string;
  days: number[];
  currentStreak: number;
  longestStreak: number;
  recentCompletions: number;
  scheduledLast14: number;
}

interface RequestBody {
  mode: "suggestions" | "insights";
  habits: HabitSummary[];
  goal?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY secret is not set in Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.mode || !Array.isArray(body.habits)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const habitText = body.habits.length
      ? body.habits
          .map(
            (h) =>
              `- ${h.emoji} ${h.name} | ${h.days.length} days/week | streak ${h.currentStreak} | best ${h.longestStreak} | ${h.recentCompletions}/${h.scheduledLast14} last 14 days`
          )
          .join("\n")
      : "(no habits yet)";

    const userPrompt =
      body.mode === "suggestions"
        ? `Suggest 3 new habits for this user.${body.goal ? ` Their goal: "${body.goal}".` : ""}\n\nCurrent habits:\n${habitText}`
        : `Give 3 personalized coaching insights based on this user's habit data.\n\nHabits:\n${habitText}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a friendly habit coach for an app called Sprout. Always respond with valid JSON only — no markdown, no code blocks. Format: {\"items\":[{\"emoji\":\"🌱\",\"title\":\"up to 6 words\",\"body\":\"1-2 sentences.\"}]}",
          },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Groq error:", response.status, responseText);
      let message = `AI error (${response.status})`;
      try {
        const parsed = JSON.parse(responseText);
        message = parsed?.error?.message ?? message;
      } catch { /* ignore */ }
      return new Response(JSON.stringify({ error: message }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = JSON.parse(responseText);
    const text: string = data.choices?.[0]?.message?.content ?? "";
    if (!text) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(text);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-coach error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
