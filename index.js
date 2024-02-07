import express from 'express';
import OpenAI from "openai";
import fs from 'fs';
import { auth } from "@qlik/api";
import { openAppSession } from "@qlik/api/qix";
import dotenv from "dotenv";
dotenv.config();

// Validate required environment variables
const requiredEnv = ['PORT', 'QLIK_HOST', 'QLIK_API_KEY', 'OPENAI_API_KEY', 'OPENAI_MODEL'];
requiredEnv.forEach(env => {
    if (!process.env[env]) {
        console.error(`Error: Missing required environment variable ${env}`);
        process.exit(1);
    }
});

const app = express();
const port = process.env.PORT;
const schema = JSON.parse(fs.readFileSync('schema.json', 'utf8'));

app.use(express.json());

// Setup Qlik Connection
const hostConfig = {
    authType: "apikey",
    host: process.env.QLIK_HOST,
    apiKey: process.env.QLIK_API_KEY,
};
auth.setDefaultHostConfig(hostConfig);

// Setup OpenAI Connection
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function getScript(appId) {
    try {
        const appSession = openAppSession({ appId });
        const app = await appSession.getDoc();
        const script = await app.getScript();
        await appSession.close();
        return script;
    } catch (error) {
        console.error('Error fetching script:', error);
        throw new Error('Failed to fetch script');
    }
}

async function getScriptDetails(script) {
    try {
        const body = {
            model: process.env.OPENAI_MODEL,
            max_tokens: 4096,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant which parses Qlik Sense load scripts"
                },
                {
                    role: "user",
                    content: `Please parse the following Qlik Sense load script: ${script}. Please respond using the following JSON format: ${JSON.stringify(schema, null, 2)}`
                }
            ],
            response_format: { "type": "json_object" },
            temperature: 0,
        };
        return await openai.chat.completions.create(body);
    } catch (error) {
        console.error('Error getting script details:', error);
        throw new Error('Failed to get script details');
    }
}

app.get('/getScriptDetails/:appId', async (req, res) => {
    try {
        const { appId } = req.params;
        const script = await getScript(appId);
        const response = await getScriptDetails(script);
        const choice = response.choices[0];
        if (choice.finish_reason === "length") {
            return res.json({ error: "The response from OpenAI is too long!" }).status(500);
        }
        res.json(JSON.parse(choice.message.content));
    } catch (error) {
        res.json({ error: error.message || "An error occurred." }).status(500);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});