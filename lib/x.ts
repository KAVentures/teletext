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

export type TopicPost = {
  id: string;
  text: string;
  username?: string;
  createdAt?: string;
  engagement: number;
  url?: string;
};

const apiBase = "https://api.x.com";

function getToken() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not configured");
  return token;
}

export async function searchXTopic(query: string): Promise<TopicPost[]> {
  const token = getToken();
  const clean = query.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!clean) return [];

  // X recent search accepts 10 as its minimum page size. Keep it deliberately
  // small so an uncached user search has a bounded and predictable read cost.
  const params = new URLSearchParams({
    query: `${clean} -is:retweet`,
    max_results: "10",
    "tweet.fields": "created_at,author_id,public_metrics",
    expansions: "author_id",
    "user.fields": "username,name,verified,verified_type"
  });

  const response = await fetch(
    `${apiBase}/2/tweets/search/recent?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`X recent search failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    data?: XPost[];
    includes?: { users?: XUser[] };
  };

  const users = new Map((payload.includes?.users || []).map((user) => [user.id, user]));
  return (payload.data || [])
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
        url: user?.username ? `https://x.com/${user.username}/status/${post.id}` : `https://x.com/i/status/${post.id}`
      };
    })
    .sort((a, b) => b.engagement - a.engagement);
}
