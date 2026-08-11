import http from 'http';

const BASE_URL = 'http://localhost:4000';

async function testEndpoint(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('1. Testing Health Endpoint...');
  let res = await testEndpoint('GET', '/api/v1/health');
  console.log(res);

  const email = `testuser_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  console.log('\n2. Testing Registration...');
  res = await testEndpoint('POST', '/api/v1/auth/register', {
    email,
    password,
    fullName: 'Test User'
  });
  console.log(res);

  console.log('\n3. Testing Login...');
  res = await testEndpoint('POST', '/api/v1/auth/login', {
    email,
    password
  });
  console.log(res);

  let token = null;
  if (res.body && res.body.data && res.body.data.accessToken) {
    token = res.body.data.accessToken;
  }

  if (token) {
    console.log('\n4. Testing /auth/me (Protected Route)...');
    res = await testEndpoint('GET', '/api/v1/auth/me', null, token);
    console.log(res);

    console.log('\n5. Testing /expense-sessions (Create Session + Transactions)...');
    res = await testEndpoint('POST', '/api/v1/expense-sessions', {
      transactions: [
        {
          clientGeneratedId: `txn_${Date.now()}_1`,
          amount: 250,
          currency: 'INR',
          category: 'Food & Dining',
          spentAt: new Date().toISOString()
        },
        {
          clientGeneratedId: `txn_${Date.now()}_2`,
          amount: 120,
          currency: 'INR',
          category: 'Transport',
          spentAt: new Date().toISOString()
        }
      ]
    }, token);
    console.log(JSON.stringify(res, null, 2));

  } else {
    console.log('\nSkipping /auth/me because login did not return a token.');
  }
}

runTests().catch(console.error);
