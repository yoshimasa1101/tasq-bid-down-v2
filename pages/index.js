import { useEffect, useState } from "react";
import QuestionBank from "../components/QuestionBank";

export default function Home() {
  const [topic, setTopic] = useState("default");

  useEffect(() => {
    // 必要に応じて初期化処理を追加できます
  }, []);

  return (
    <div>
      <h1>TASQ JAPAN</h1>
      <p>逆オークションMVPへようこそ</p>
      <QuestionBank topic={topic} />
    </div>
  );
}
