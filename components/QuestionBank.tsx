import { useEffect, useState } from "react";

interface QuestionBankProps {
  topic: string;
}

const QuestionBank = ({ topic }: QuestionBankProps) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/questions?topic=${encodeURIComponent(topic)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: string[] = await res.json();
        setQuestions(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load questions");
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [topic]);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "red" }}>エラー: {error}</p>;

  return (
    <section>
      <h2>Questions for {topic}</h2>
      {questions.length === 0 ? (
        <p>質問がありません。</p>
      ) : (
        <ul>
          {questions.map((q, idx) => (
            <li key={idx}>{q}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default QuestionBank;
