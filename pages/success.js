import Link from "next/link";
import { getItem, isValidBid, getCurrentPrice } from "../lib/auction";

export default function SuccessPage({ item, amount, name, valid }) {
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
      <h1 style={styles.h1}>入札結果</h1>

      {valid ? (
        <div style={styles.cardOk}>
          <p style={styles.p}>
            <strong>{name}</strong> さん、入札を受け付けました！
          </p>
          <p style={styles.p}>
            商品：<strong>{item.title}</strong>
          </p>
          <p style={styles.p}>
            入札金額：<strong>¥{amount.toLocaleString()}</strong>
          </p>
          <p style={styles.note}>
            これはMVPデモです。実際の確定・通知・支払いは本番実装で行います。
          </p>
        </div>
      ) : (
        <div style={styles.cardNg}>
          <p style={styles.p}>
            入札条件に合致しませんでした（現在価格以下・下限以上で入札してください）。
          </p>
          <Link href={`/bid/${item.id}`} style={styles.btnPrimary}>入札画面に戻る</Link>
        </div>
      )}

      <div style={styles.actions}>
        <Link href="/" style={styles.btn}>一覧へ</Link>
        <Link href={`/item/${item.id}`} style={styles.btn}>商品詳細へ</Link>
      </div>
    </main>
  );
}

export async function getServerSideProps({ query }) {
  const { id, amount, name = "" } = query;
  const item = getItem(id);
  if (!item) return { props: { item: null, amount: null, name: "", valid: false } };

  const num = Number(amount);
  const valid = isValidBid(num, item, Date.now());
  // 表示のために現在価格も評価（厳密な承認は本番でAPI化）
  getCurrentPrice(item, Date.now());

  return {
    props: {
      item,
      amount: num,
      name: decodeURIComponent(name),
      valid
    }
  };
}

const styles = {
  main: { maxWidth: 720, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" },
  h1: { fontSize: 24, marginBottom: 12 },
  p: { color: "#555", margin: "8px 0" },
  cardOk: { border: "1px solid #cde7c7", background: "#f3fbf1", borderRadius: 12, padding: 16 },
  cardNg: { border: "1px solid #f5c2c7", background: "#fff5f5", borderRadius: 12, padding: 16 },
  note: { color: "#777", fontSize: 13, marginTop: 8 },
  actions: { display: "flex", gap: 8, marginTop: 16 },
  btn: { padding: "8px 12px", background: "#f0f0f0", color: "#333", borderRadius: 8, textDecoration: "none" },
  btnPrimary: { padding: "8px 12px", background: "#000", color: "#fff", borderRadius: 8, textDecoration: "none" }
};

