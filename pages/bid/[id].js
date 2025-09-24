import { useState } from "react";
import Link from "next/link";
import { getItem, getCurrentPrice, isValidBid } from "../../lib/auction";
import { useRouter } from "next/router";

export default function BidPage({ item, currentPrice }) {
  const router = useRouter();
  const [amount, setAmount] = useState(currentPrice);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  if (!item) {
    return (
      <main style={styles.main}>
        <h1 style={styles.h1}>商品が見つかりませんでした</h1>
        <Link href="/" style={styles.btn}>一覧に戻る</Link>
      </main>
    );
  }

  const onSubmit = (e) => {
    e.preventDefault();
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      setError("入札金額を正しく入力してください。");
      return;
    }
    if (!name.trim()) {
      setError("お名前（またはニックネーム）を入力してください。");
      return;
    }
    if (!isValidBid(val, item, Date.now())) {
      setError(`現在価格以下かつ下限以上で入札してください（現在価格: ¥${currentPrice.toLocaleString()}）。`);
      return;
    }
    // 成功時は success ページへ遷移（MVPのためフロントで完結）
    router.push(`/success?id=${item.id}&amount=${val}&name=${encodeURIComponent(name)}`);
  };

  return (
    <main style={styles.main}>
      <Link href={`/item/${item.id}`} style={styles.linkBack}>← 戻る</Link>
      <h1 style={styles.h1}>入札</h1>
      <p style={styles.p}><strong>{item.title}</strong></p>
      <p style={styles.price}>
        現在価格: <strong>¥{currentPrice.toLocaleString()}</strong>
        <span style={styles.meta}>
          （開始 ¥{item.startPrice.toLocaleString()} / 下限 ¥{item.floorPrice.toLocaleString()}）
        </span>
      </p>

      <form onSubmit={onSubmit} style={styles.form}>
        <label style={styles.label}>
          入札金額（円）
          <input
            type="number"
            min={item.floorPrice}
            max={currentPrice}
            step="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          お名前（ニックネーム可）
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            placeholder="例）芳政"
          />
        </label>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" style={styles.btnPrimary}>この金額で入札する</button>
      </form>
    </main>
  );
}

export async function getServerSideProps({ params }) {
  const item = getItem(params.id);
  if (!item) return { props: { item: null, currentPrice: null } };
  const currentPrice = getCurrentPrice(item, Date.now());
  return { props: { item, currentPrice } };
}

const styles = {
  main: { maxWidth: 720, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" },
  h1: { fontSize: 24, marginBottom: 12 },
  p: { color: "#555", margin: "8px 0" },
  price: { marginTop: 8, fontSize: 16 },
  meta: { marginLeft: 8, color: "#888", fontSize: 13 },
  form: { display: "grid", gap: 12, marginTop: 16 },
  label: { display: "grid", gap: 6 },
  input: { padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 16 },
  error: { color: "#b00020", marginTop: 4 },
  btnPrimary: { padding: "10px 14px", background: "#000", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer" },
  linkBack: { display: "inline-block", marginBottom: 12, color: "#333", textDecoration: "none" },
  btn: { padding: "8px 12px", background: "#f0f0f0", color: "#333", borderRadius: 8, textDecoration: "none" }
};

