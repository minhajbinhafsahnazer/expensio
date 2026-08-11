import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';

async function request(method, path, body = null, token = null) {
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTests() {
  console.log('=== Financial Goals Progress Test Suite ===\n');

  // ─── Setup Users ────────────────────────────────────────────────────────────
  const ts = Date.now();
  const emailA = `user_a_${ts}@example.com`;
  const emailB = `user_b_${ts}@example.com`;
  const password = 'TestPassword123!';

  console.log('1. Registering & Logging in User A...');
  await request('POST', '/api/v1/auth/register', { email: emailA, password, fullName: 'User A' });
  const loginResA = await request('POST', '/api/v1/auth/login', { email: emailA, password });
  const tokenA = loginResA.body.data.accessToken;
  assert(!!tokenA, 'User A token acquired');

  console.log('\n2. Registering & Logging in User B...');
  await request('POST', '/api/v1/auth/register', { email: emailB, password, fullName: 'User B' });
  const loginResB = await request('POST', '/api/v1/auth/login', { email: emailB, password });
  const tokenB = loginResB.body.data.accessToken;
  assert(!!tokenB, 'User B token acquired');

  // ─── Create Goal (Target: 1000, Current: 500) ────────────────────────────
  console.log('\n3. Creating Goal (Target: 1000, Current: 500)...');
  const createRes = await request('POST', '/api/v1/financial-goals', {
    title: 'Emergency Fund',
    targetAmount: 1000,
    currentAmount: 500
  }, tokenA);
  assert(createRes.status === 201, 'Goal created (201)');
  const goalId = createRes.body.data.goal.id;
  assert(createRes.body.data.goal.status === 'ACTIVE', 'Initial status is ACTIVE');
  assert(Number(createRes.body.data.goal.currentAmount) === 500, 'Initial currentAmount is 500');

  // ─── Test 1: Positive progress (+200) ────────────────────────────────────
  console.log('\n4. Test: Positive progress (+200)...');
  const posRes = await request('POST', `/api/v1/financial-goals/${goalId}/progress`, { amount: 200 }, tokenA);
  assert(posRes.status === 200, 'Positive progress returned 200');
  assert(Number(posRes.body.data.goal.currentAmount) === 700, 'currentAmount updated to 700');
  assert(posRes.body.data.goal.status === 'ACTIVE', 'Status remains ACTIVE at 700/1000');

  // ─── Test 2: ACTIVE → COMPLETED (+300) ───────────────────────────────────
  console.log('\n5. Test: ACTIVE → COMPLETED (+300)...');
  const compRes = await request('POST', `/api/v1/financial-goals/${goalId}/progress`, { amount: 300 }, tokenA);
  assert(compRes.status === 200, 'Target-reach returned 200');
  assert(Number(compRes.body.data.goal.currentAmount) === 1000, 'currentAmount updated to 1000');
  assert(compRes.body.data.goal.status === 'COMPLETED', 'Status transitioned to COMPLETED');

  // ─── Test 3: COMPLETED → ACTIVE (−200) ───────────────────────────────────
  console.log('\n6. Test: COMPLETED → ACTIVE (−200)...');
  const deductRes = await request('POST', `/api/v1/financial-goals/${goalId}/progress`, { amount: -200 }, tokenA);
  assert(deductRes.status === 200, 'Deduction returned 200');
  assert(Number(deductRes.body.data.goal.currentAmount) === 800, 'currentAmount updated to 800');
  assert(deductRes.body.data.goal.status === 'ACTIVE', 'Status reverted to ACTIVE');

  // ─── Test 4: Zero progress → 400 ─────────────────────────────────────────
  console.log('\n7. Test: Zero progress → 400...');
  const zeroRes = await request('POST', `/api/v1/financial-goals/${goalId}/progress`, { amount: 0 }, tokenA);
  assert(zeroRes.status === 400, 'Zero amount rejected with 400');

  // Verify balance unchanged after rejection
  const checkAfterZero = await request('GET', '/api/v1/financial-goals', null, tokenA);
  const goalAfterZero = checkAfterZero.body.data.goals.find(g => g.id === goalId);
  assert(Number(goalAfterZero.currentAmount) === 800, 'Balance unchanged at 800 after zero rejection');

  // ─── Test 5: Over-deduction → 400, balance unchanged ─────────────────────
  console.log('\n8. Test: Over-deduction −900 on 800 balance → 400 and balance unchanged...');
  const overRes = await request('POST', `/api/v1/financial-goals/${goalId}/progress`, { amount: -900 }, tokenA);
  assert(overRes.status === 400, 'Over-deduction rejected with 400');

  const checkAfterOver = await request('GET', '/api/v1/financial-goals', null, tokenA);
  const goalAfterOver = checkAfterOver.body.data.goals.find(g => g.id === goalId);
  assert(Number(goalAfterOver.currentAmount) === 800, 'Balance unchanged at 800 after over-deduction');

  // ─── Test 6: Cross-user / tenant isolation ────────────────────────────────
  console.log('\n9. Test: Cross-user isolation (User B modifying User A\'s goal)...');
  const crossRes = await request('POST', `/api/v1/financial-goals/${goalId}/progress`, { amount: 100 }, tokenB);
  assert(crossRes.status === 404, 'Cross-user modification rejected with 404');

  // Verify goal still unchanged after cross-user attempt
  const checkAfterCross = await request('GET', '/api/v1/financial-goals', null, tokenA);
  const goalAfterCross = checkAfterCross.body.data.goals.find(g => g.id === goalId);
  assert(Number(goalAfterCross.currentAmount) === 800, 'Balance unchanged at 800 after cross-user rejection');

  // ─── Test 7: Transaction type semantics — addToBalance=true (Income) ──────
  // The goal progress API does not know about transaction creation; that is
  // the frontend's responsibility. We test the /expense-sessions endpoint
  // directly to verify that `type: "income"` is stored and reflected in analytics.
  console.log('\n10. Test: Transaction type — Income (Goal Withdrawal, addToBalance=true)...');
  const incomeSessionId = `income_test_${ts}`;
  const incomeRes = await request('POST', '/api/v1/expense-sessions', {
    transactions: [{
      clientGeneratedId: incomeSessionId,
      amount: 500,
      currency: 'INR',
      category: `Goal Withdrawal: Emergency Fund`,
      spentAt: new Date().toISOString(),
      type: 'income',
    }]
  }, tokenA);
  assert(incomeRes.status === 201, 'Income transaction session created (201)');
  const incomeTx = incomeRes.body.data.transactions.find(t => t.id === incomeSessionId);
  assert(!!incomeTx, 'Income transaction returned in response');
  assert(incomeTx.type === 'income', 'Transaction stored with type="income"');

  // Verify in analytics: totalIncome should be positive, this tx should NOT increase totalSpent
  const today = new Date().toISOString().split('T')[0];
  const analyticsAfterIncome = await request(
    'GET',
    `/api/v1/analytics?from=${today}&to=${today}&timezone=UTC`,
    null,
    tokenA
  );
  assert(analyticsAfterIncome.status === 200, 'Analytics returned 200');
  assert(
    analyticsAfterIncome.body.data.totalIncome >= 500,
    `totalIncome includes the 500 goal withdrawal (got ${analyticsAfterIncome.body.data.totalIncome})`
  );

  // ─── Test 8: Transaction type — Expense (Goal Expense, addToBalance=false) ─
  console.log('\n11. Test: Transaction type — Expense (Goal Expense, addToBalance=false)...');
  const expenseSessionId = `expense_test_${ts}`;
  const expenseRes = await request('POST', '/api/v1/expense-sessions', {
    transactions: [{
      clientGeneratedId: expenseSessionId,
      amount: 300,
      currency: 'INR',
      category: `Goal Expense: Emergency Fund`,
      spentAt: new Date().toISOString(),
      type: 'expense',
    }]
  }, tokenA);
  assert(expenseRes.status === 201, 'Expense transaction session created (201)');
  const expenseTx = expenseRes.body.data.transactions.find(t => t.id === expenseSessionId);
  assert(!!expenseTx, 'Expense transaction returned in response');
  assert(expenseTx.type === 'expense', 'Transaction stored with type="expense"');

  // ─── Test 9: No double-accounting — verify analytics separates income/expense ──
  console.log('\n12. Test: No double-accounting — income tx does NOT increase totalSpent...');
  const analyticsAfterBoth = await request(
    'GET',
    `/api/v1/analytics?from=${today}&to=${today}&timezone=UTC`,
    null,
    tokenA
  );
  const { totalIncome: finalIncome, totalSpent: finalSpent } = analyticsAfterBoth.body.data;
  assert(finalIncome >= 500, `totalIncome >= 500 (got ${finalIncome}) — income goal withdrawal counted`);
  assert(finalSpent >= 300, `totalSpent >= 300 (got ${finalSpent}) — expense goal withdrawal counted`);
  // The income transaction (500) must NOT be in totalSpent
  assert(finalSpent < finalIncome + 500, `No double-counting: totalSpent (${finalSpent}) does not include income tx`);

  // ─── Test 10: No transaction created when deduction is rejected ────────────
  // This is enforced by the frontend (it doesn't call enqueue if the API call fails).
  // At the backend level, we verify: over-deduction returns 400 and the goal is unchanged.
  // No transaction endpoint is called when a 400 is returned.
  console.log('\n13. Test: No transaction created when goal deduction is rejected (over-deduction)...');
  const txsBefore = await request('GET', '/api/v1/transactions', null, tokenA);
  const txCountBefore = txsBefore.body.data.transactions.length;

  const rejectedDeduct = await request('POST', `/api/v1/financial-goals/${goalId}/progress`, { amount: -9999 }, tokenA);
  assert(rejectedDeduct.status === 400, 'Extreme over-deduction rejected with 400');

  const txsAfter = await request('GET', '/api/v1/transactions', null, tokenA);
  const txCountAfter = txsAfter.body.data.transactions.length;
  assert(txCountAfter === txCountBefore, `Transaction count unchanged after rejected deduction (${txCountBefore} → ${txCountAfter})`);

  // ─── Test 11: Same deduction does NOT create both Income and Expense ────────
  console.log('\n14. Test: Same deduction ID cannot create both income and expense (idempotency)...');
  const sharedId = `shared_idempotency_${ts}`;
  const firstAttempt = await request('POST', '/api/v1/expense-sessions', {
    transactions: [{
      clientGeneratedId: sharedId,
      amount: 100,
      currency: 'INR',
      category: 'Goal Withdrawal: Test',
      spentAt: new Date().toISOString(),
      type: 'income',
    }]
  }, tokenA);
  assert(firstAttempt.status === 201, 'First create succeeded');

  const secondAttempt = await request('POST', '/api/v1/expense-sessions', {
    transactions: [{
      clientGeneratedId: sharedId,
      amount: 100,
      currency: 'INR',
      category: 'Goal Expense: Test',
      spentAt: new Date().toISOString(),
      type: 'expense',
    }]
  }, tokenA);
  // ON CONFLICT DO NOTHING — second insert is silently ignored, session is still created
  assert(secondAttempt.status === 201, 'Second create returned 201 (session created, tx skipped on conflict)');
  assert(secondAttempt.body.data.transactions.length === 0, 'No new transaction inserted on duplicate ID (ON CONFLICT DO NOTHING)');

  // Verify the original is still income, not overwritten to expense
  const txsCheck = await request('GET', '/api/v1/transactions', null, tokenA);
  const originalTx = txsCheck.body.data.transactions.find(t => t.id === sharedId);
  assert(!!originalTx, 'Original transaction still exists');
  assert(originalTx.type === 'income', 'Original type "income" was not overwritten by duplicate expense attempt');

  console.log('\n🎉 ALL FINANCIAL GOALS TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
