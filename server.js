const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// =========================
// OpenAI
// =========================

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// =========================
// Supabase
// =========================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// =========================
// AIによる攻撃名分類
// =========================

app.post("/classify", async (req, res) => {
    try {
        const attackName = req.body.attackName;

        const response = await client.responses.create({
            model: "gpt-5-mini",
            input: `
あなたはゲームの攻撃名分類AIです。

攻撃名：
${attackName}

以下の5種類から必ず1つ選んでください。

炎
雷
氷
風
ビーム

さらに、なぜその属性だと判断したのか、
ゲーム画面に表示できる短い理由を1文で考えてください。

必ず以下の形式で返してください。

属性：炎
理由：名前から強い熱や爆発のイメージを感じるためです。
`
        });

        const text = response.output_text.trim();

        const typeMatch = text.match(/属性[：:]\s*(炎|雷|氷|風|ビーム)/);
        const reasonMatch = text.match(/理由[：:]\s*(.+)/);

        const attackType = typeMatch ? typeMatch[1] : "炎";

        const reason = reasonMatch
            ? reasonMatch[1].trim()
            : "技名のイメージからこの属性と判断しました。";

        res.json({
            attackType: attackType,
            reason: reason
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "AI分類に失敗しました"
        });
    }
});

// =========================
// ランキング登録
// =========================

app.post("/ranking", async (req, res) => {
    try {
        const {
            playerName,
            score,
            attackName,
            attackType
        } = req.body;

        // 最低限のチェック
        if (!playerName || typeof score !== "number") {
            return res.status(400).json({
                error: "ランキングデータが不正です"
            });
        }

        const { data, error } = await supabase
            .from("rankings")
            .insert([
                {
                    player_name: playerName.slice(0, 12),
                    score: Math.max(0, Math.floor(score)),
                    attack_name: String(attackName || "").slice(0, 20),
                    attack_type: String(attackType || "").slice(0, 10)
                }
            ])
            .select();

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error("ランキング登録エラー:", error);

        res.status(500).json({
            error: "ランキング登録に失敗しました"
        });
    }
});

// =========================
// TOP10取得
// =========================

app.get("/ranking", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("rankings")
            .select("player_name, score, attack_name, attack_type")
            .order("score", { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json(data);

    } catch (error) {
        console.error("ランキング取得エラー:", error);

        res.status(500).json({
            error: "ランキング取得に失敗しました"
        });
    }
});

// =========================
// ランキング全削除（管理者用）
// =========================

app.delete("/ranking", async (req, res) => {
    try {
        const adminKey = req.headers["x-admin-key"];

        if (!adminKey || adminKey !== process.env.ADMIN_RESET_KEY) {
            return res.status(403).json({
                error: "管理者キーが違います"
            });
        }

        const { error } = await supabase
            .from("rankings")
            .delete()
            .neq("id", -1);

        if (error) throw error;

        res.json({
            success: true
        });

    } catch (error) {
        console.error("ランキング削除エラー:", error);

        res.status(500).json({
            error: "ランキング削除に失敗しました"
        });
    }
});

// =========================
// サーバー起動
// =========================

app.listen(process.env.PORT || 3000, () => {
    console.log("サーバー起動");
});
