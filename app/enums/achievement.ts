type AchievementReward = {
  criteria: number
  reward: string
}

export const ACHIEVEMENT_REWARD_CONFIG: AchievementReward[] = [
  {
    criteria: 200000, // 2L
    reward: 'Laptop Bag',
  },
  {
    criteria: 500000, // 5L
    reward: 'Trolly Bag',
  },
  {
    criteria: 1000000, // 10L
    reward: 'Tablet',
  },
  {
    criteria: 2500000, // 25L
    reward: 'Laptop',
  },
  {
    criteria: 5000000, // 50L
    reward: 'Refrigerator',
  },
  {
    criteria: 10000000, // 1Cr
    reward: 'One Bike Full Payment',
  },
  {
    criteria: 30000000, // 3Cr
    reward: 'Royal Enfield Bike',
  },
  {
    criteria: 50000000, // 5Cr
    reward: 'One Car',
  },
  {
    criteria: 150000000, // 15Cr
    reward: '1 two BHK flat apartment',
  },
]
