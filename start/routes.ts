/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

/*
|--------------------------------------------------------------------------
| Auth
|--------------------------------------------------------------------------
*/
const AuthController = () => import('#controllers/auth_controller')
router
  .group(() => {
    router.get('signup', [AuthController, 'signupPage']).as('signup.page')
    router.get('login', [AuthController, 'loginPage']).as('login.page')

    router.post('signup', [AuthController, 'signup']).as('signup')
    router.post('login', [AuthController, 'login']).as('login')
  })
  .as('auth')
  .use(middleware.guest())
router.post('logout', [AuthController, 'logout']).use(middleware.auth()).as('auth.logout')

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/
const DashboardController = () => import('#controllers/dashboard_controller')
router
  .group(() => {
    router.get('dashboard', [DashboardController, 'index']).as('index')
  })
  .as('dashboard')
  .use(middleware.auth())
  .use(middleware.admin())

/*
|--------------------------------------------------------------------------
| Members
|--------------------------------------------------------------------------
*/
const MembersController = () => import('#controllers/members_controller')
router
  .group(() => {
    router.get('/', [MembersController, 'index']).as('index')
    router.post('/', [MembersController, 'store']).as('store')
    router.get('/:id/children', [MembersController, 'children']).as('children')
    router.get('/:id/lookup', [MembersController, 'lookup']).as('lookup')
  })
  .as('members')
  .use(middleware.auth())
  .prefix('members')

router.get('tree', [MembersController, 'tree']).as('tree').use(middleware.auth())

/*
|--------------------------------------------------------------------------
| Settings
|--------------------------------------------------------------------------
*/
const SettingsController = () => import('#controllers/settings_controller')
router
  .group(() => {
    router.get('activate', [SettingsController, 'activatePage']).as('activate.page')
    router.post('activate', [SettingsController, 'activate']).as('activate')

    router.get('profile', [SettingsController, 'profile']).as('profile.page')
    router.patch('profile', [SettingsController, 'updateProfile']).as('profile')
    router.patch('profile/password', [SettingsController, 'updatePassword']).as('profile.password')

    router.get('bank', [SettingsController, 'bankPage']).as('bank.page')
    router.post('bank', [SettingsController, 'updateBank']).as('bank')

    router.get('kyc', [SettingsController, 'kycPage']).as('kyc.page')
    router.post('kyc', [SettingsController, 'updateKyc']).as('kyc')
  })
  .as('settings')
  .prefix('settings')
  .use(middleware.auth())

/*
|--------------------------------------------------------------------------
| Gold
|--------------------------------------------------------------------------
*/
const GoldController = () => import('#controllers/golds_controller')
router
  .group(() => {
    router.get('purchase', [GoldController, 'purchasePage']).as('purchase.page')
    router.post('purchase', [GoldController, 'purchase']).as('purchase')
    router.get('purchase/:id/bill', [GoldController, 'downloadPurchaseBill']).as('purchase.bill')
    router.get('customers/search', [GoldController, 'searchCustomers']).as('customers.search')
  })
  .use(middleware.auth())
  .use(middleware.activeUser())
  .prefix('gold')
  .as('gold')

/*
|--------------------------------------------------------------------------
| Investments
|--------------------------------------------------------------------------
*/
const InvestmentsController = () => import('#controllers/investments_controller')
router
  .group(() => {
    router.get('investments', [InvestmentsController, 'index']).as('investments.index')
    router.post('investments', [InvestmentsController, 'store']).as('investments.store')
    router
      .post('investments/withdraw-income', [InvestmentsController, 'withdrawIncome'])
      .as('investments.withdrawIncome')
  })
  .as('investments')
  .use(middleware.auth())

/*
|--------------------------------------------------------------------------
| Wallet
|--------------------------------------------------------------------------
*/
const WalletController = () => import('#controllers/wallet_controller')
router
  .group(() => {
    router.get('/', [WalletController, 'page']).as('page')
    router.get('send', [WalletController, 'sendPage']).as('send.page')
    router.post('transfer', [WalletController, 'transfer']).as('transfer')
    router.get('search', [WalletController, 'search']).as('search')

    // Admin: add balance to any user
    router
      .post('add-balance', [WalletController, 'addBalance'])
      .as('add.balance')
      .use(middleware.admin())

    // Admin: view specific user's wallet history
    router
      .get('users/:userId', [WalletController, 'userHistory'])
      .as('user.history')
      .use(middleware.admin())

    // Self-activation using wallet balance (min ₹1000)
    router.post('activate', [WalletController, 'activateAccount']).as('activate')
  })
  .as('wallet')
  .use(middleware.auth())
  .prefix('wallet')

/*
|--------------------------------------------------------------------------
| Rewards
|--------------------------------------------------------------------------
*/
const RewardsController = () => import('#controllers/rewards_controller')
const AchievementsController = () => import('#controllers/achievements_controller')
const WithdrawalsController = () => import('#controllers/withdrawals_controller')

router
  .get('reward/achievement', [AchievementsController, 'index'])
  .as('achievements.page')
  .use(middleware.auth())

router
  .group(() => {
    // router.get('achievements', [AchievementsController, 'index']).as('achievements.page') // Removed

    router.get('activation', [RewardsController, 'activationPage']).as('activation.page')
    router.get('cashback', [RewardsController, 'cashbackPage']).as('cashback.page')
    router.get('salaries', [RewardsController, 'salaryPage']).as('salary.page')
    router.get('reward-award', [RewardsController, 'rewardAwardPage']).as('reward.award.page')
    router.get('withdrawal', [WithdrawalsController, 'index']).as('withdrawal.page')

    router
      .post('withdraw/activation/:type', [RewardsController, 'withdrawActivation'])
      .as('withdraw.activation')
    router
      .post('withdraw/cashback', [RewardsController, 'withdrawCashback'])
      .as('withdraw.cashback')
    router.post('withdraw/salary', [RewardsController, 'withdrawSalary']).as('withdraw.salary')
  })
  .use(middleware.auth())
  .prefix('rewards')
  .as('rewards')

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/
const AdminUsersController = () => import('#controllers/admin/users_controller')
const AdminKycController = () => import('#controllers/admin/kyc_controller')
const AdminBankController = () => import('#controllers/admin/bank_controller')

const AdminPurchaseController = () => import('#controllers/admin/purchase_controller')
const AdminWithdrawalController = () => import('#controllers/admin/withdrawal_controller')
const AdminSettingsController = () => import('#controllers/admin/settings_controller')
const AdminAchievementsController = () => import('#controllers/admin/achievements_controller')
const AdminWalletController = () => import('#controllers/admin/wallet_controller')
const AdminStatementController = () => import('#controllers/admin/statement_controller')
const ActivationController = () => import('#controllers/activation_controller')
router
  .group(() => {
    ////// Users
    router
      .group(() => {
        router.get('/', [AdminUsersController, 'index']).as('page')
        router.post('/', [AdminUsersController, 'store']).as('store')
        router.get('/:id', [AdminUsersController, 'show']).as('show')
        router.patch('/:id', [AdminUsersController, 'updateProfile']).as('update')
        router.post('/:id/bank', [AdminUsersController, 'updateBank']).as('bank.update')
        router.post('/:id/kyc', [AdminUsersController, 'updateKyc']).as('kyc.update')
        router
          .patch('/:id/password', [AdminUsersController, 'updatePassword'])
          .as('password.update')
        router.post('/:id/impersonate', [AdminUsersController, 'impersonate']).as('impersonate')
        router.post('/:id/activate', [AdminUsersController, 'activate']).as('activate')
        router.get('/:id/tree', [AdminUsersController, 'tree']).as('tree')
        router.get('/:id/lookup', [AdminUsersController, 'lookup']).as('lookup')
      })
      .prefix('users')
      .as('users')

    ////// KYC
    router
      .group(() => {
        router.get('/', [AdminKycController, 'index']).as('page')
        router.patch('/:id', [AdminKycController, 'update']).as('update')
      })
      .prefix('kyc')
      .as('kyc')

    ////// Bank
    router
      .group(() => {
        router.get('', [AdminBankController, 'index']).as('page')
        router.post('/:id', [AdminBankController, 'update']).as('update')
      })
      .prefix('bank')
      .as('bank')

    ////// Activation
    router
      .group(() => {
        router.get('/', ({ inertia }) => inertia.render('admin/activation')).as('page')
        router.post('/user', [ActivationController, 'activateUser']).as('activate.user')
      })
      .prefix('activation')
      .as('activation')

    ////// Gold Purchases
    router
      .group(() => {
        router.get('/', [AdminPurchaseController, 'index']).as('page')
        router
          .patch('/:id/details', [AdminPurchaseController, 'updateDetails'])
          .as('update.details')
        router.patch('/:id', [AdminPurchaseController, 'update']).as('update')
        router.get('/users/:userId', [AdminPurchaseController, 'history']).as('user.history')
      })
      .prefix('purchases')
      .as('purchases')

    ////// Withdrawal
    router
      .group(() => {
        router.get('/', [AdminWithdrawalController, 'index']).as('page')
        router.post('/:id', [AdminWithdrawalController, 'update']).as('update')
      })
      .prefix('withdrawal')
      .as('withdrawal')

    ////// Settings
    router
      .group(() => {
        router.get('/', [AdminSettingsController, 'index']).as('page')
      })
      .prefix('settings')
      .as('settings')

    ////// Achievements
    router
      .group(() => {
        router.get('/', [AdminAchievementsController, 'index']).as('page')
        router
          .get('/users/:userId', [AdminAchievementsController, 'userAchievements'])
          .as('user.history')
        router.post('/:id/collect', [AdminAchievementsController, 'collect']).as('collect')
      })
      .prefix('achievements')
      .as('achievements')

    ////// Wallet
    router
      .group(() => {
        router.get('/', [AdminWalletController, 'index']).as('page')
        router.post('/add-balance', [AdminWalletController, 'addBalance']).as('add.balance')
        router
          .post('/add-own-balance', [AdminWalletController, 'addOwnBalance'])
          .as('add.own.balance')
        router.get('/users/:userId', [AdminWalletController, 'history']).as('user.history')
      })
      .prefix('wallet')
      .as('wallet')

    ////// Settings - Password Change
    router
      .group(() => {
        router.post('/password', [AdminSettingsController, 'updatePassword']).as('password.update')
      })
      .prefix('settings')
      .as('settings')

    ////// User Purchase (admin makes purchase on behalf of user)
    router.get('/purchase', ({ inertia }) => inertia.render('admin/purchase')).as('purchase.page')
    router.post('/users/:id/purchase', [AdminUsersController, 'makePurchase']).as('users.purchase')

    ////// Purchase Invoice Download (admin downloads any purchase invoice)
    router
      .get('/purchases/:id/invoice', [AdminPurchaseController, 'downloadInvoice'])
      .as('purchases.invoice')

    ////// Statements - View all transactions across all users
    router
      .group(() => {
        router.get('/', [AdminStatementController, 'index']).as('page')
      })
      .prefix('statements')
      .as('statements')

    ////// Platform Configuration (admin-managed settings)
    const AdminConfigController = () => import('#controllers/admin/config_controller')
    router
      .group(() => {
        router.get('/', [AdminConfigController, 'platformSettings']).as('page')
        router.post('/update', [AdminConfigController, 'updatePlatformSetting']).as('update')
      })
      .prefix('config')
      .as('config')

    router
      .get('/config/investment-packages', [AdminConfigController, 'investmentPackages'])
      .as('config.investment.packages')
    router
      .post('/config/investment-packages/update', [
        AdminConfigController,
        'updateInvestmentPackage',
      ])
      .as('config.investment.packages.update')

    router
      .get('/config/performance-incentives', [AdminConfigController, 'performanceIncentives'])
      .as('config.performance.incentives')
    router
      .post('/config/performance-incentives/update', [
        AdminConfigController,
        'updatePerformanceIncentive',
      ])
      .as('config.performance.incentives.update')

    router
      .get('/config/reward-awards', [AdminConfigController, 'rewardAwards'])
      .as('config.reward.awards')
    router
      .post('/config/reward-awards/update', [AdminConfigController, 'updateRewardAward'])
      .as('config.reward.awards.update')

    router
      .get('/config/membership-levels', [AdminConfigController, 'membershipLevelIncomes'])
      .as('config.membership.levels')
    router
      .post('/config/membership-levels/update', [
        AdminConfigController,
        'updateMembershipLevelIncome',
      ])
      .as('config.membership.levels.update')

    router
      .get('/config/level-incomes', [AdminConfigController, 'levelIncomes'])
      .as('config.level.incomes')
    router
      .post('/config/level-incomes/update', [AdminConfigController, 'updateLevelIncome'])
      .as('config.level.incomes.update')

    ////// Gold Billing Rates
    router
      .get('/config/gold-billing', [AdminConfigController, 'goldBilling'])
      .as('config.gold.billing')
    router
      .post('/config/gold-billing/update', [AdminConfigController, 'updateGoldBilling'])
      .as('config.gold.billing.update')

    ////// Month-end Payout
    const AdminPayoutController = () => import('#controllers/admin/payout_controller')
    const AdminPayoutHistoryController = () =>
      import('#controllers/admin/payout_history_controller')
    router
      .group(() => {
        router.get('/', [AdminPayoutController, 'index']).as('page')
        router
          .post('/income-wallet', [AdminPayoutController, 'incomeWalletPayout'])
          .as('income.wallet')
        router
          .post('/working-wallet', [AdminPayoutController, 'workingWalletPayout'])
          .as('working.wallet')
        router.post('/reset', [AdminPayoutController, 'reset']).as('reset')
        router.get('/history', [AdminPayoutHistoryController, 'index']).as('history')
      })
      .prefix('payout')
      .as('payout')
  })
  .prefix('admin')
  .as('admin')
  .use(middleware.admin())

/*
| Advanced Business Engine (Hidden - not in navigation)
*/
const BusinessEngineController = () => import('#controllers/admin/business_engine_controller')

router
  .group(() => {
    router.get('/gate', [BusinessEngineController, 'gate']).as('gate')
    router.post('/gate', [BusinessEngineController, 'authenticate']).as('authenticate')
  })
  .prefix('admin/system/advanced/business-engine')
  .use(middleware.auth())
  .use(middleware.admin())

router
  .group(() => {
    router.get('/', [BusinessEngineController, 'index']).as('index')
    router.post('/gold-config', [BusinessEngineController, 'updateGoldConfig']).as('gold.update')
    router
      .post('/income-distribution', [BusinessEngineController, 'updateIncomeDistribution'])
      .as('income.update')
    router
      .post('/cash-reward', [BusinessEngineController, 'upsertCashRewardSlab'])
      .as('cash-reward.upsert')
    router
      .post('/cash-reward/:id/delete', [BusinessEngineController, 'deleteCashRewardSlab'])
      .as('cash-reward.delete')
    router
      .post('/membership-level', [BusinessEngineController, 'upsertMembershipLevel'])
      .as('membership-level.upsert')
    router
      .post('/level-income', [BusinessEngineController, 'upsertLevelIncome'])
      .as('level-income.upsert')
    router
      .post('/performance-incentive', [BusinessEngineController, 'upsertPerformanceIncentive'])
      .as('performance-incentive.upsert')
    router
      .post('/business-rules', [BusinessEngineController, 'updateBusinessRules'])
      .as('business-rules.update')
    router.get('/audit-log', [BusinessEngineController, 'auditLog']).as('audit-log')
  })
  .prefix('admin/system/advanced/business-engine')
  .use(middleware.auth())
  .use(middleware.admin())
  .use(middleware.businessEngine())

/*
|--------------------------------------------------------------------------
| Website Routes
|--------------------------------------------------------------------------
*/

router
  .group(() => {
    router.on('/').renderInertia('website/Index').as('home')
    router.on('/products').renderInertia('website/ProductListing').as('products.index')
    router
      .get('/products/:id', ({ params, inertia }) => {
        return inertia.render('website/ProductDetail', { id: params.id })
      })
      .as('products.show')
    router.on('/about').renderInertia('website/AboutUs').as('about')
    router.on('/mission').renderInertia('website/MissionVision').as('mission')
  })
  .use(middleware.silentAuth())

router.get('gatekeep', ({ inertia }) => {
  return inertia.render('gatekeep')
})

const DebugController = () => import('#controllers/debug_controller')
router.get('debug/payout', [DebugController, 'payout']).use(middleware.admin())
router.get('debug/payout/cleanup', [DebugController, 'cleanupPayout']).use(middleware.admin())
router.get('debug/payout/dry-run', [DebugController, 'dryRunPayout']).use(middleware.admin())

router.attachments()
