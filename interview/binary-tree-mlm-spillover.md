---
sessionID: ses_2223f91c6ffeuaEM7psr6V9kLR
baseMessageCount: 5
updatedAt: 2026-04-30T10:09:54.559Z
---

# now lets change the flow little bit in new system there will be only two user under a user left and right and I will have two diff invite link for left leg and right leg if someone joins via left then the user will go to the end of the left leg and same for right so my childrens will have only one leg always free and other leg can be filled by the parent or predecesors Core Rules:
Each user can have a maximum of two direct children: Each user should have two unique invite links:

Left invite link → places new users in the left subtree
Right invite link → places new users in the right subtree When a new user registers using an invite link:

Identify the root parent user
Identify whether the join is for left or right leg Spillover Behavior:

If the direct sponsor already has both children filled,
the new user should be placed under the next available node in that leg
This ensures a balanced tree growth lets plan this out and implement this

## Current spec

Binary tree MLM with strict DFS spillover: left joins go down left children only, right joins go down right children only, never crossing legs. Each user has one leg occupied by spillover, one leg free for manual placement via their other invite link. Sponsor = link owner. DB wiped clean (fresh migration). Invite codes encode leg (HJL/HJR prefix). Activation gate (₹1000 + admin approval) kept as-is. Tree extends indefinitely.

## Q&A history

Q: How should we handle existing users in the current flat system? They don't have left/right leg positions yet.
A: we wiped our db so no need to concern ourself and can existing db migration files and can do node ace migration:fresh

Q: How should the left and right invite links differ in the URL?
A: Encoded in code — the invite code itself encodes the leg (e.g., HJL12345 vs HJR12345)

Q: Does the ₹1000 activation gate still apply? New users register → must pay → admin approves → can access features?
A: keep it as it is will discuss it later

Q: When doing DFS spillover down the left leg, what happens if every node in that subtree is full (both children occupied)?
A: it will go indefinitely to left leg, if joing in left leg then it will join to left of the last available children and will not look for right leg at all
