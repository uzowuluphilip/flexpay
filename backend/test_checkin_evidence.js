const http = require('http');

const email = 'liveguard_1786709677_5032@test.local';
const password = 'Password123';
const apiBase = 'http://localhost:8000';

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiBase + path);
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5175',
      ...headers
    };

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: defaultHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('STEP 1: LOGIN');
  console.log('========================================\n');

  const loginResp = await makeRequest('POST', '/api/auth/login', {}, {
    email,
    password
  });

  console.log('LOGIN RESPONSE:');
  console.log(JSON.stringify(loginResp.body, null, 2));
  console.log('');

  const token = loginResp.body?.data?.token;
  if (!token) {
    console.log('ERROR: No token received');
    process.exit(1);
  }

  console.log(`Token: ${token}\n`);

  console.log('========================================');
  console.log('STEP 2: CHECK-IN STATUS BEFORE CHECK-IN');
  console.log('========================================\n');

  const beforeResp = await makeRequest('GET', '/api/wallet/checkin-status', {
    'Authorization': `Bearer ${token}`
  });

  console.log('BEFORE CHECK-IN:');
  console.log(JSON.stringify(beforeResp.body, null, 2));
  console.log('');

  const dayBefore = beforeResp.body?.data?.currentDay;
  const unlockedBefore = beforeResp.body?.data?.unlockedDays;
  console.log(`Current Day Before: ${dayBefore}`);
  console.log(`Unlocked Days Before: ${JSON.stringify(unlockedBefore)}\n`);

  console.log('========================================');
  console.log('STEP 3: PERFORM CHECK-IN');
  console.log('========================================\n');

  const checkinResp = await makeRequest('POST', '/api/wallet/checkin', {
    'Authorization': `Bearer ${token}`
  }, {});

  console.log('CHECK-IN RESPONSE:');
  console.log(JSON.stringify(checkinResp.body, null, 2));
  console.log('');

  const dayAfterCheckin = checkinResp.body?.data?.currentDay;
  const unlockedAfterCheckin = checkinResp.body?.data?.unlockedDays;
  const claimedToday = checkinResp.body?.data?.claimedToday;
  console.log(`Current Day After Check-In: ${dayAfterCheckin}`);
  console.log(`Unlocked Days After: ${JSON.stringify(unlockedAfterCheckin)}`);
  console.log(`Claimed Today: ${claimedToday}\n`);

  console.log('========================================');
  console.log('STEP 4: CHECK-IN STATUS AFTER CHECK-IN');
  console.log('========================================\n');

  const afterResp = await makeRequest('GET', '/api/wallet/checkin-status', {
    'Authorization': `Bearer ${token}`
  });

  console.log('AFTER CHECK-IN:');
  console.log(JSON.stringify(afterResp.body, null, 2));
  console.log('');

  const dayAfter = afterResp.body?.data?.currentDay;
  const unlockedAfter = afterResp.body?.data?.unlockedDays;
  console.log(`Current Day After: ${dayAfter}`);
  console.log(`Unlocked Days After: ${JSON.stringify(unlockedAfter)}\n`);

  console.log('========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Streak Changed: Day ${dayBefore} → Day ${dayAfter}`);
  console.log(`Claims Today: ${claimedToday}`);
  console.log(`Unlocked Days: ${JSON.stringify(unlockedAfter)}`);
  console.log(`Success: ${dayAfter > dayBefore ? 'YES - Streak incremented' : 'NO - No change'}`);
}

main().catch(console.error);
