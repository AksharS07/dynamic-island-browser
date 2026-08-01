const fs = require('fs');
const readline = require('readline');
async function search() {
    const fileStream = fs.createReadStream('C:\\Users\\Akshar Srijan\\.gemini\\antigravity\\brain\\adfb1a16-cec5-498c-9d01-00adb4f2507e\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    for await (const line of rl) {
        if (line.includes('Reverie') || line.includes('Code Carnage') || line.includes('AI Builders')) {
            const data = JSON.parse(line);
            if (data.content) {
                console.log(`[${data.source}] ${data.content.substring(0, 500)}...\n`);
            }
        }
    }
}
search();
