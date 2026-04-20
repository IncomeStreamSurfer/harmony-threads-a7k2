import type { APIRoute } from "astro";
import { anonClient } from "../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async () => {
  const SITE = (import.meta.env.PUBLIC_SITE_URL ?? "https://harmony-threads-a7k2.vercel.app").replace(/\/$/, "");
  const sb = anonClient();

  const [{ data: pages }, { data: articles }, { data: products }] = await Promise.all([
    sb ? sb.from("pages").select("slug, title, meta_description").not("published_at", "is", null) : { data: [] },
    sb ? sb.from("content").select("slug, title, excerpt").not("published_at", "is", null).order("published_at", { ascending: false }).limit(30) : { data: [] },
    sb ? sb.from("products").select("slug, name, description").not("published_at", "is", null) : { data: [] },
  ]);

  const lines: string[] = [];
  lines.push("# Harmony Threads");
  lines.push("");
  lines.push("> Premium vintage rock music merch — graphic tees, digital music history, and curated fragrances for true fans. Based in London, ships worldwide.");
  lines.push("");
  lines.push("## Key pages");
  lines.push("");
  for (const p of pages ?? []) {
    const url = p.slug === "home" ? SITE : `${SITE}/${p.slug}`;
    lines.push(`- [${p.title}](${url}): ${p.meta_description ?? ""}`);
  }
  lines.push(`- [Shop](${SITE}/shop): Browse all Harmony Threads products.`);
  lines.push(`- [Blog / Stories](${SITE}/blog): Rock music history and style guides.`);

  if (products && products.length > 0) {
    lines.push("");
    lines.push("## Products");
    lines.push("");
    for (const p of products) {
      lines.push(`- [${p.name}](${SITE}/shop/${p.slug}): ${p.description?.slice(0, 100) ?? ""}`);
    }
  }

  if (articles && articles.length > 0) {
    lines.push("");
    lines.push("## Latest articles");
    lines.push("");
    for (const a of articles) {
      lines.push(`- [${a.title}](${SITE}/blog/${a.slug}): ${a.excerpt ?? ""}`);
    }
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
