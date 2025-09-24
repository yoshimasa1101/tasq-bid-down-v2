import Link from "next/link";
import { getItems, getCurrentPrice } from "../lib/auction";

export default function Home() {
  const items = getItems();
  const now = Date.now();

  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>逆オークション（MVP）</h1>
      <p style={styles.p}>価格は時間とともに下がります。現在価格で入札可能です。</p>

      <ul style={styles.grid}>
        {items.map((item) => {
          const currentPrice = getCurrentPrice(item, now);
          return (
            <li key={item.id} style={styles.card}>
              <img src={item.image} alt={item.title} style={styles.img} />
              <h2 style={styles.h2}>{item.title}</h2>
              <p style={styles.p}>{item.description}</p>
              <p style={styles.price}>
                現在価格: <strong>¥{currentPrice.toLocaleString()}</strong>
                <span style={styles.meta}>
                  （開始 ¥{item.startPrice.toLocaleString()} / 下限 ¥{item.floorPrice.toLocaleString()}）
                </span>
              </p>
              <div style={styles.actions}>
                <Link href={`/item/${item.id}`} style={styles.btnPrimary}>
                  詳細を見る
                </Link>
                <Link href={`/bid/${item.id}`} style={styles.btnSecondary}>
                  入札する
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

const styles = {
  main: { maxWidth: 960, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" },
  h1: { fontSize: 28, marginBottom: 8 },
  h2: { fontSize: 20, margin: "12px 0 6px" },
  p: { color: "#555", margin: "6px 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, listStyle: "none", padding: 0 },
  card: { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" },
  img: { width: "100%", height: 150, objectFit: "cover", borderRadius: 8, background: "#f3f3f3" },
  price: { marginTop: 8, fontSize: 16 },
  meta: { marginLeft: 8, color: "#888", fontSize: 13 },
  actions: { display: "flex", gap: 8, marginTop: 12 },
  btnPrimary: { padding: "8px 12px", background: "#000", color: "#fff", borderRadius: 8, textDecoration: "none" },
  btnSecondary: { padding: "8px 12px", background: "#f0f0f0", color: "#333", borderRadius: 8, textDecoration: "none" }
};

