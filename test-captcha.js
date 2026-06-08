// Test CAPTCHA endpoints
import http from 'http';

async function testCaptcha() {
  try {
    // Test challenge
    console.log('Testing /api/captcha-challenge...');
    const challengeData = await fetchJson('http://localhost:3000/api/captcha-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    
    console.log('Challenge Response:', JSON.stringify(challengeData, null, 2));
    
    if (!challengeData.success || !challengeData.sessionId) {
      console.error('No session ID in response');
      return;
    }
    
    const { challenge, sessionId } = challengeData;
    console.log(`\nGot challenge: "${challenge}" with session: ${sessionId}`);
    
    // Parse answer
    const match = challenge.match(/(\d+)\s*\+\s*(\d+)/);
    if (!match) {
      console.error('Could not parse challenge');
      return;
    }
    
    const a = parseInt(match[1]);
    const b = parseInt(match[2]);
    const answer = a + b;
    console.log(`Parsed: ${a} + ${b} = ${answer}`);
    
    // Test verification with correct answer
    console.log('\nTesting /api/captcha-verify with CORRECT answer...');
    const verifyResponseCorrect = await fetchJson('http://localhost:3000/api/captcha-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: answer.toString(), sessionId })
    });
    console.log('Correct Answer Response:', JSON.stringify(verifyResponseCorrect, null, 2));
    
    // Get new challenge for testing wrong answer
    console.log('\n\nGetting new challenge for testing wrong answer...');
    const challengeData2 = await fetchJson('http://localhost:3000/api/captcha-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    
    console.log('Second Challenge Response:', JSON.stringify(challengeData2, null, 2));
    
    if (challengeData2.sessionId) {
      console.log('\nTesting /api/captcha-verify with WRONG answer...');
      const verifyResponseWrong = await fetchJson('http://localhost:3000/api/captcha-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: '999', sessionId: challengeData2.sessionId })
      });
      console.log('Wrong Answer Response:', JSON.stringify(verifyResponseWrong, null, 2));
    }
    
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

function fetchJson(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

testCaptcha();
