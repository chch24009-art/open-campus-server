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

以下の5種類から必ず1つだけ選んでください。

炎
雷
氷
風
ビーム

返答は属性名だけにしてください。
例：
炎
`
        });

        const attackType = response.output_text.trim();

        res.json({
            attackType: attackType
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "AI分類に失敗しました"
        });
    }
});

app.listen(3000, () => {
    console.log("サーバー起動：http://localhost:3000");
});