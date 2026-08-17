const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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

app.listen(process.env.PORT || 3000, () => {
    console.log("サーバー起動");
});
