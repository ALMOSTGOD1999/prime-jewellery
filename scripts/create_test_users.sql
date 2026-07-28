-- Create 4 test users between PJ997860 and PJ248892
-- Hierarchy: PJ997860 -> new1 -> new2 -> new3 -> new4 -> PJ248892

-- Step 1: Check existing users
SELECT id, name, parent_id, status FROM users WHERE id IN (997860, 248892);

-- Step 2: Create 4 new users
-- Note: Replace the password hash below with the output of: node -p "require('@adonisjs/core/services/hash').default.make('password')"
-- Or use the hash from an existing user

-- Create Test id new 1 (parent: PJ997860)
INSERT INTO users (id, name, email, phone, gender, role, password, status, activated_at, activation_amount, parent_id, leg, wallet_balance, income_wallet, reward_wallet, repurchase_wallet, working_wallet, total_invested, created_at, updated_at)
VALUES (997861, 'Test id new 1', 'test1@test.com', '9000000001', 'other', 'user', '$scrypt$...HASH_HERE...', 'active', NOW(), 1000, 997860, 'left', 0, 0, 0, 0, 0, 0, NOW(), NOW());

-- Create Test id new 2 (parent: PJ997861)
INSERT INTO users (id, name, email, phone, gender, role, password, status, activated_at, activation_amount, parent_id, leg, wallet_balance, income_wallet, reward_wallet, repurchase_wallet, working_wallet, total_invested, created_at, updated_at)
VALUES (997862, 'Test id new 2', 'test2@test.com', '9000000002', 'other', 'user', '$scrypt$...HASH_HERE...', 'active', NOW(), 1000, 997861, 'left', 0, 0, 0, 0, 0, 0, NOW(), NOW());

-- Create Test id new 3 (parent: PJ997862)
INSERT INTO users (id, name, email, phone, gender, role, password, status, activated_at, activation_amount, parent_id, leg, wallet_balance, income_wallet, reward_wallet, repurchase_wallet, working_wallet, total_invested, created_at, updated_at)
VALUES (997863, 'Test id new 3', 'test3@test.com', '9000000003', 'other', 'user', '$scrypt$...HASH_HERE...', 'active', NOW(), 1000, 997862, 'left', 0, 0, 0, 0, 0, 0, NOW(), NOW());

-- Create Test id new 4 (parent: PJ997863)
INSERT INTO users (id, name, email, phone, gender, role, password, status, activated_at, activation_amount, parent_id, leg, wallet_balance, income_wallet, reward_wallet, repurchase_wallet, working_wallet, total_invested, created_at, updated_at)
VALUES (997864, 'Test id new 4', 'test4@test.com', '9000000004', 'other', 'user', '$scrypt$...HASH_HERE...', 'active', NOW(), 1000, 997863, 'left', 0, 0, 0, 0, 0, 0, NOW(), NOW());

-- Step 3: Move PJ248892 to be child of Test id new 4
UPDATE users SET parent_id = 997864 WHERE id = 248892;

-- Step 4: Verify the chain
SELECT id, name, parent_id, status FROM users WHERE id IN (997860, 997861, 997862, 997863, 997864, 248892) ORDER BY id;
