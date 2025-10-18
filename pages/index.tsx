import { useEffect, useState } from "react";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RevenueRow = {
  id: number;
  request_id: string;
  request_created_at: string;
  offer_id: string;
  offer_created_at: string;
  signed_date: string;
  revenue: number;
};

export default function Home() {
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    request_id: "",
    request_created_at: "",
    offer_id: "",
    offer_created_at: "",
    signed_date: "",
    revenue: ""
  });

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    const { data, error } = await supabase
      .from("revenue_data")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("データ取得エラー:", error.message);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  const handleInsert = async () => {
    const { error } = await supabase.from("revenue_data").insert([
      {
        request_id: form.request_id,
        request_created_at: form.request_created_at,
        offer_id: form.offer_id,
        offer_created_at: form.offer_created_at,
        signed_date: form.signed_date,
        revenue: Number(form.revenue)
      }
    ]);

    if (error) {
      console.error("追加エラー:", error.message);
    } else {
      setForm({
        request_id: "",
        request_created_at: "",
        offer_id: "",
        offer_created_at: "",
        signed_date: "",
        revenue: ""
      });
      fetchRevenueData();
    }
  };

  return (
    <>
      <Head>
        <title>TASQ JAPAN</title>
      </Head>
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1>TASQ JAPAN</h1>

        <h2>新規データ追加</h2>
        <div style={{ display: "grid", gap: "0.5rem", maxWidth: "500px" }}>
          {Object.keys(form).map((key) => (
            <input
              key={key}
              type={key === "revenue" ? "number" : "text"}
              placeholder={key}
              value={(form as any)[key]}
              onChange={(e) =>
                setForm({ ...form, [key]: e.target.value })
              }
            />
          ))}
          <button onClick={handleInsert}>追加</button>
        </div>

        <h2>データ一覧</h2>
        {loading ? (
          <p>読み込み中...</p>
        ) : rows.length === 0 ? (
          <p>データがありません。</p>
        ) : (
          <table border={1} cellPadding={8}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Request ID</th>
                <th>Request Created</th>
                <th>Offer ID</th>
                <th>Offer Created</th>
                <th>Signed Date</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.request_id}</td>
                  <td>{row.request_created_at}</td>
                  <td>{row.offer_id}</td>
                  <td>{row.offer_created_at}</td>
                  <td>{row.signed_date}</td>
                  <td>{row.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
