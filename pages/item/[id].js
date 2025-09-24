import { useEffect, useState } from "react";
import Link from "next/link";
import { getItem, getCurrentPrice } from "../../lib/auction";

export default function ItemDetail({ item, initialPrice }) {
  const [price, setPrice] = useState(initialPrice);

  useEffect(() => {
    // 30秒ごとに現在価格を再計算（表示更新のみ）
    const t = setInterval(() => {
      setPrice(getCurrentPrice(item, Date.now()));
    }, 30_000);
    return () => clearInterval(t);
  }, [item]);

  if (!item) {
    return (
      <main style={styles.main}>
        <h1 style={styles.h1}>商品が見つかりませんでした</h1>
        <Link href="/" style={styles.btn}>一覧に戻る</Link>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.linkBack}>← 一覧に戻る</Link>
      <h1 style={styles.h1}>{item.title}</h1>
      <img src={item.image} alt={item.title} style={styles.img} />
      <p style={styles.p}>{item.description}</p>
      <p style={styles.price}>
        現在価格: <strong>¥{price.toLocaleString()}</strong>
        <span style={styles.meta}>
          （開始 ¥{item.startPrice.toLocaleString()} / 下限 ¥{item.floorPrice.toLocaleString()}）
        </span>
      </p>
      <div style={styles.actions}>
        <Link href={`/bid/${item.id}`} style={styles.btnPrimary}>この価格で入札する</Link>
      </div>
    </main>
  );
}

export async function getServerSideProps({ params }) {
  const item = getItem(params.id);
  if (!item) {
    return { props: { item: null, initialPrice: null } };
  }
  const initialPrice = getCurrentPrice(item, Date.now());
  return { props: { item, initialPrice } };
}

const styles = {
  main: { maxWidth: 800, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" },
  h1: { fontSize: 24, marginBottom: 12 },
  p: { color: "#555", margin: "8px 0" },
  img: { width: "100%", height: 360, objectFit: "cover", borderRadius: 12, background: "#f3f3f3" },
  price: { marginTop: 12, fontSize: 18 },
  meta: { marginLeft: 8, color: "#888", fontSize: 13 },
  actions: { display: "flex", gap: 8, marginTop: 16 },
  btnPrimary: { padding: "10px 14px", background: "#000", color: "#fff", borderRadius: 8, textDecoration: "none" },
  linkBack: { display: "inline-block", marginBottom: 12, color: "#333", textDecoration: "none" },
  btn: { padding: "8px 12px", background: "#f0f0f0", color: "#333", borderRadius: 8, textDecoration: "none" }
};

