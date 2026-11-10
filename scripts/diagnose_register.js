const BASE_URL = 'http://localhost:5000/api/v1';

async function postRegister(payload) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch((err) => ({ parseError: err.message }));
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body };
}

async function run() {
  console.log('--- TEST 1: Fresh Rider Registration ---');
  const riderPayload = {
    name: 'Rider Test',
    email: `test_rider_${Date.now()}@example.com`,
    password: 'Password123!',
    phone: '+919876543210',
    role: 'EV_OWNER',
    city: 'Bengaluru',
  };
  const riderRes = await postRegister(riderPayload);
  console.log('Rider Status:', riderRes.status);
  console.log('Rider Body:', JSON.stringify(riderRes.body, null, 2));

  console.log('\n--- TEST 2: Second Registration with SAME default phone (+919876543210) ---');
  const hostPayloadSamePhone = {
    name: 'Host Test',
    email: `test_host_${Date.now()}@example.com`,
    password: 'Password123!',
    phone: '+919876543210',
    role: 'HOST',
    city: 'Bengaluru',
  };
  const hostResSamePhone = await postRegister(hostPayloadSamePhone);
  console.log('Host (same phone) Status:', hostResSamePhone.status);
  console.log('Host (same phone) Body:', JSON.stringify(hostResSamePhone.body, null, 2));

  console.log('\n--- TEST 3: Fresh Host Registration with NEW phone ---');
  const hostPayloadNewPhone = {
    name: 'Host Test 2',
    email: `test_host_new_${Date.now()}@example.com`,
    password: 'Password123!',
    phone: '+919876543212',
    role: 'HOST',
    city: 'Bengaluru',
  };
  const hostResNewPhone = await postRegister(hostPayloadNewPhone);
  console.log('Host (new phone) Status:', hostResNewPhone.status);
  console.log('Host (new phone) Body:', JSON.stringify(hostResNewPhone.body, null, 2));

  console.log('\n--- TEST 4: Duplicate Email Registration ---');
  const dupEmailPayload = {
    name: 'Duplicate Email User',
    email: riderPayload.email,
    password: 'Password123!',
    phone: '+919876543213',
    role: 'EV_OWNER',
    city: 'Bengaluru',
  };
  const dupEmailRes = await postRegister(dupEmailPayload);
  console.log('Dup Email Status:', dupEmailRes.status);
  console.log('Dup Email Body:', JSON.stringify(dupEmailRes.body, null, 2));

  console.log('\n--- TEST 5: Various Phone Formats ---');
  const phoneFormats = [
    '9876543210',
    '+91 9876543210',
    '+91-9876543210',
    '09876543210',
    '+919876543210',
    '12345',
    '98765',
    'abcdefghij',
  ];

  for (const ph of phoneFormats) {
    const res = await postRegister({
      name: 'Phone Format Test',
      email: `phone_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
      password: 'Password123!',
      phone: ph,
      role: 'HOST',
      city: 'Bengaluru',
    });
    console.log(`Phone "${ph}" -> Status: ${res.status}, Message: ${res.body.message || JSON.stringify(res.body.errors)}`);
  }
}

run().catch(console.error);
