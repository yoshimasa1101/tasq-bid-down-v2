import { useEffect, useState } from "react";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase.from("items").select("id, name");
      if (error) {
        console.error("データ取得エラー:", error.message);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  return (
    <>
      <Head>
        <title>TASQ JAPAN</title>
      </Head>
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1>TASQ JAPAN</h1>
        {loading ? (
          <p>読み込み中...</p>
        ) : items.length === 0 ? (
          <p>データがありません。</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
