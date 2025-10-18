import { useEffect, useState } from "react";
import QuestionBank from "../components/QuestionBank";

export default function Home() {
  const [topic, setTopic] = useState("default");

  useEffect(() => {
    // 必要なら初期化処理
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>TASQ JAPAN</h1>
      <p>逆オークションMVPへようこそ</p>

      <label htmlFor="topic">トピックを選択：</label>{" "}
      <select
        id="topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        <option value="default">default</option>
        <option value="pricing">pricing</option>
        <option value="workflow">workflow</option>
      </select>

      <QuestionBank topic={topic} />
    </main>
  );
}
