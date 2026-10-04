type XTrend = {
  name: string;
  query?: string;
  tweet_volume?: number | null;
};

type XPost = {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
  };
};

type XUser = {
  id: string;
  username?: string;
  name?: string;
  verified?: boolean;
  verified_type?: string;
};

export type XSignalBundle = {
  trends: string[];
  posts: Array<{
    id: string;
    text: string;
    username?: string;
    createdAt?: string;
    engagement: number;
    url?: string;
  }>;
};

const apiBase = "https://api.x.com";

function getToken() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not configured");
  return token;
}

function quoteTrend(name: string) {
  const clean = name.replace(/[“”"]/g, "").trim();
  if (!clean) return "";
  if (clean.startsWith("#") || clean.startsWith("$") || !clean.includes(" ")) return clean;
  return `"${clean}"`;
}

export async function fetchXSignals(): Promise<XSignalBundle> {
  const token = getToken();
  const woeid = process.env.X_WOEID || "1";
  const maxTrends = Math.max(2, Math.min(10, Number(process.env.X_MAX_TRENDS || 6)));
  const sampleSize = Math.max(10, Math.min(100, Number(process.env.X_POST_SAMPLE_SIZE || 20)));
  const language = (process.env.X_LANGUAGE || "en").trim();

  const trendResponse = await fetch(
    `${apiBase}/1.1/trends/place.json?id=${encodeURIComponent(woeid)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    }
  );

  if (!trendResponse.ok) {
    const body = await trendResponse.text();
    throw new Error(`X trends request failed (${trendResponse.status}): ${body.slice(0, 240)}`);
  }

  const trendPayload = (await trendResponse.json()) as Array<{ trends?: XTrend[] }>;
  const trends = (trendPayload[0]?.trends || [])
    .map((trend) => trend.name)
    .filter(Boolean)
    .slice(0, maxTrends);

  if (!trends.length) throw new Error("X returned no trends for the configured location");

  // Use one recent-search request across the current trend set. This keeps X read
  // consumption predictable instead of issuing a separate search for every trend.
  const terms = trends.map(quoteTrend).filter(Boolean);
  let query = `(${terms.join(" OR ")}) -is:retweet`;
  if (language) query += ` lang:${language}`;

  const params = new URLSearchParams({
    query,
    max_results: String(sampleSize),
    "tweet.fields": "created_at,author_id,public_metrics",
    expansions: "author_id",
    "user.fields": "username,name,verified,verified_type"
  });

  const searchResponse = await fetch(
    `${apiBase}/2/tweets/search/recent?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    }
  );

  if (!searchResponse.ok) {
    const body = await searchResponse.text();
    throw new Error(`X recent search failed (${searchResponse.status}): ${body.slice(0, 240)}`);
  }

  const payload = (await searchResponse.json()) as {
    data?: XPost[];
    includes?: { users?: XUser[] };
  };

  const users = new Map((payload.includes?.users || []).map((user) => [user.id, user]));
  const posts = (payload.data || [])
    .map((post) => {
      const user = post.author_id ? users.get(post.author_id) : undefined;
      const metrics = post.public_metrics || {};
      const engagement =
        (metrics.like_count || 0) +
        2 * (metrics.retweet_count || 0) +
        2 * (metrics.quote_count || 0) +
        (metrics.reply_count || 0);
      return {
        id: post.id,
        text: post.text,
        username: user?.username,
        createdAt: post.created_at,
        engagement,
        url: user?.username ? `https://x.com/${user.username}/status/${post.id}` : undefined
      };
    })
    .sort((a, b) => b.engagement - a.engagement);

  return { trends, posts };
}
