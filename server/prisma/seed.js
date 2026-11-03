const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BugTrack AI database seeding...');

  // Clean existing data
  await prisma.verification.deleteMany({});
  await prisma.pullRequest.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  // Hashes for demo passwords
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const testerPassword = await bcrypt.hash('Tester@123', 10);
  const devPassword = await bcrypt.hash('Developer@123', 10);
  const altDevPassword = await bcrypt.hash('Dev@12345', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Elena Rostova (Admin)',
      email: 'admin@bugtrack.ai',
      passwordHash: adminPassword,
      role: 'ADMIN',
      skills: 'System Architecture, Security, Release Engineering, Scrum Master',
    },
  });

  const tester = await prisma.user.create({
    data: {
      name: 'Marcus Vance (QA Lead)',
      email: 'tester@bugtrack.ai',
      passwordHash: testerPassword,
      role: 'TESTER',
      skills: 'Regression Testing, Cypress, Postman, UI/UX Verification, Performance',
    },
  });

  const developer = await prisma.user.create({
    data: {
      name: 'Devin Cole (Senior Fullstack)',
      email: 'developer@bugtrack.ai',
      passwordHash: devPassword,
      role: 'DEVELOPER',
      skills: 'React, Node.js, TypeScript, REST APIs, Tailwind CSS, Auth/Security',
    },
  });

  const developer2 = await prisma.user.create({
    data: {
      name: 'Alex Chen (Backend Specialist)',
      email: 'alex.dev@bugtrack.ai',
      passwordHash: altDevPassword,
      role: 'DEVELOPER',
      skills: 'Node.js, PostgreSQL, Microservices, Docker, Redis, Queue Systems',
    },
  });

  const developer3 = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins (Frontend Engineer)',
      email: 'sarah.fullstack@bugtrack.ai',
      passwordHash: altDevPassword,
      role: 'DEVELOPER',
      skills: 'React, Vite, State Management, UI/UX Design, Accessibility',
    },
  });

  console.log('✅ Users created');

  // 2. Create Projects
  const finPay = await prisma.project.create({
    data: {
      name: 'FinPay Digital Banking',
      description: 'Enterprise online payment gateway, peer-to-peer transfers, and multi-currency digital wallet application.',
      ownerId: admin.id,
      githubRepository: 'https://github.com/facebook/react',
    },
  });

  const cloudFlow = await prisma.project.create({
    data: {
      name: 'CloudFlow DevOps Platform',
      description: 'Unified telemetry, container management, and continuous delivery pipelines for microservices.',
      ownerId: admin.id,
      githubRepository: 'https://github.com/vercel/next.js',
    },
  });

  console.log('✅ Projects created');

  // 3. Add Project Members
  const members = [
    { projectId: finPay.id, userId: admin.id, role: 'ADMIN' },
    { projectId: finPay.id, userId: tester.id, role: 'TESTER' },
    { projectId: finPay.id, userId: developer.id, role: 'DEVELOPER' },
    { projectId: finPay.id, userId: developer2.id, role: 'DEVELOPER' },
    { projectId: finPay.id, userId: developer3.id, role: 'DEVELOPER' },

    { projectId: cloudFlow.id, userId: admin.id, role: 'ADMIN' },
    { projectId: cloudFlow.id, userId: tester.id, role: 'TESTER' },
    { projectId: cloudFlow.id, userId: developer.id, role: 'DEVELOPER' },
    { projectId: cloudFlow.id, userId: developer2.id, role: 'DEVELOPER' },
  ];

  for (const m of members) {
    await prisma.projectMember.create({ data: m });
  }

  // 4. Create Issues for FinPay
  const issue1 = await prisma.issue.create({
    data: {
      issueKey: 'FIN-101',
      projectId: finPay.id,
      title: 'Authentication token expiration causes blank dashboard screen',
      description: 'When JWT access token expires after 15 minutes, axios interceptor fails to renew token and renders empty white screen instead of redirecting to login.',
      stepsToReproduce: '1. Log into customer portal\n2. Wait 15 minutes for access token expiration\n3. Click Transactions tab\n4. Observe blank white screen with Uncaught Error in console.',
      expectedResult: 'System should smoothly refresh token or redirect user to login with session expired message.',
      actualResult: 'Blank white screen with console error: Cannot read properties of undefined (reading data).',
      environment: 'Chrome 122 / Windows 11 / Staging',
      severity: 'CRITICAL',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      reporterId: tester.id,
      assigneeId: developer.id,
    },
  });

  const issue2 = await prisma.issue.create({
    data: {
      issueKey: 'FIN-102',
      projectId: finPay.id,
      title: 'Double charge occurring on rapid click of Confirm Payment button',
      description: 'Payment submit button is not debounced or disabled during flight, enabling users on slow connections to trigger duplicate charge API calls.',
      stepsToReproduce: '1. Navigate to checkout\n2. Select card payment\n3. Rapidly double-click or triple-click Confirm Payment',
      expectedResult: 'Button enters loading state on first click; idempotency key prevents duplicate transaction charges.',
      actualResult: 'User card gets charged twice and two transaction records appear in database.',
      environment: 'Production & Staging / All Browsers',
      severity: 'CRITICAL',
      priority: 'CRITICAL',
      status: 'OPEN',
      reporterId: tester.id,
      assigneeId: null,
    },
  });

  const samplePrDiffAnalysis = JSON.stringify({
    riskLevel: 'MEDIUM',
    changeSummary: 'Added multipart/form-data size limit configuration to 10MB in express body-parser and updated avatar upload controller with validation.',
    potentialRisks: [
      'Increased payload memory footprint on concurrent image uploads',
      'Client side error handling for non-JPEG/PNG MIME types needs defensive checks',
      'CDN cache invalidation might lag on profile updates'
    ],
    affectedModules: [
      'UserService.js',
      'UploadMiddleware.js',
      'AvatarComponent.jsx',
      'UserProfilePage.jsx'
    ],
    suggestedRegressionTests: [
      'Verify upload of 5MB JPEG avatar succeeds and renders',
      'Verify upload of 15MB file returns clean 413 Payload Too Large error dialog',
      'Verify uploading corrupt or executable file is rejected with 400 Bad Request',
      'Verify user profile page updates immediately without hard reload'
    ],
    missingScenarios: [
      'Simultaneous multi-tab profile picture uploads from same account',
      'Network throttle or aborted upload handling'
    ],
    rationale: 'Core backend payload limits modified; while straightforward, buffer handling directly affects server memory during peak traffic.'
  });

  const issue3 = await prisma.issue.create({
    data: {
      issueKey: 'FIN-103',
      projectId: finPay.id,
      title: 'Profile avatar upload fails with 413 Payload Too Large on 2MB images',
      description: 'Default Express JSON/multipart payload limit is set to 1MB. Users attempting to upload high-res 2MB-5MB photos get 413 error without user-facing feedback.',
      stepsToReproduce: '1. Go to Settings -> User Profile\n2. Click Change Avatar\n3. Select any standard 2.4MB JPEG photo\n4. Observe red error toast and failure to persist',
      expectedResult: 'System should accept photos up to 10MB, auto-compress client side or handle gracefully.',
      actualResult: 'HTTP 413 Payload Too Large error and upload spinner never dismisses.',
      environment: 'Web / All Browsers',
      severity: 'MEDIUM',
      priority: 'MEDIUM',
      status: 'READY_FOR_TESTING',
      reporterId: tester.id,
      assigneeId: developer.id,
    },
  });

  const issue4 = await prisma.issue.create({
    data: {
      issueKey: 'FIN-104',
      projectId: finPay.id,
      title: 'Export to CSV freezes UI thread when transaction history exceeds 10,000 records',
      description: 'Client-side CSV generator blocks main JavaScript thread when generating export for accounts with high transaction volume.',
      stepsToReproduce: '1. Select account with >10,000 transactions\n2. Click Export to CSV\n3. Browser prompts "Page Unresponsive"',
      expectedResult: 'Export processed via Web Worker or streamed chunk by chunk without freezing UI.',
      actualResult: 'Page freezes for 8-12 seconds.',
      environment: 'Chrome / Safari',
      severity: 'HIGH',
      priority: 'HIGH',
      status: 'CLOSED',
      reporterId: tester.id,
      assigneeId: developer.id,
    },
  });

  const issue5 = await prisma.issue.create({
    data: {
      issueKey: 'FIN-105',
      projectId: finPay.id,
      title: 'Dark mode theme toggle resets to light mode after page refresh',
      description: 'Theme preference is stored only in React state and is not synced to localStorage or user profile preferences.',
      stepsToReproduce: '1. Toggle Dark Mode\n2. Refresh the page\n3. App reverts to Light Mode',
      expectedResult: 'Dark mode preference persists across reloads and browser sessions.',
      actualResult: 'App reverts to Light Mode immediately upon reload.',
      environment: 'Chrome 122 / Windows',
      severity: 'LOW',
      priority: 'LOW',
      status: 'REOPENED',
      reporterId: tester.id,
      assigneeId: developer3.id,
    },
  });

  // CloudFlow issues
  const issue6 = await prisma.issue.create({
    data: {
      issueKey: 'CLD-201',
      projectId: cloudFlow.id,
      title: 'Kubernetes pod metrics charts fail to refresh after network reconnect',
      description: 'WebSocket telemetry channel does not trigger automatic backoff reconnect when client switches network or laptop resumes from sleep.',
      stepsToReproduce: '1. Open Cluster Telemetry view\n2. Disconnect Wi-Fi for 10 seconds\n3. Reconnect Wi-Fi\n4. Realtime graph stays frozen at disconnect timestamp',
      expectedResult: 'WebSocket client reconnects within 3 seconds and fetches missed time-series metrics.',
      actualResult: 'Socket state remains CLOSED, no error indicated to user.',
      environment: 'Firefox 120 / macOS & Windows',
      severity: 'HIGH',
      priority: 'HIGH',
      status: 'ASSIGNED',
      reporterId: tester.id,
      assigneeId: developer2.id,
    },
  });

  const issue7 = await prisma.issue.create({
    data: {
      issueKey: 'CLD-202',
      projectId: cloudFlow.id,
      title: 'Webhook signature verification rejects valid GitHub payload with HMAC mismatch',
      description: 'Body parser mutates raw request buffer before HMAC-SHA256 signature calculation, causing webhook verification to fail on non-ASCII characters.',
      stepsToReproduce: '1. Configure GitHub repository webhook\n2. Trigger push with commit message containing emojis\n3. Server returns 401 Unauthorized',
      expectedResult: 'Raw request buffer preserved for HMAC hash calculation; returns 200 OK.',
      actualResult: '401 Unauthorized with error "Invalid webhook signature".',
      environment: 'Node.js 20 / Linux Staging',
      severity: 'CRITICAL',
      priority: 'HIGH',
      status: 'READY_FOR_TESTING',
      reporterId: tester.id,
      assigneeId: developer.id,
    },
  });

  console.log('✅ Issues created');

  // 5. Seed Pull Request for FIN-103
  await prisma.pullRequest.create({
    data: {
      issueId: issue3.id,
      repository: 'facebook/react',
      prNumber: 28419,
      title: 'fix(uploads): increase multipart payload limit and add client-side image compression',
      url: 'https://github.com/facebook/react/pull/28419',
      state: 'open',
      changedFiles: JSON.stringify([
        'server/src/middleware/upload.js',
        'server/src/controllers/userController.js',
        'client/src/components/AvatarUpload.jsx',
        'client/src/utils/imageCompressor.js'
      ]),
      aiSummary: 'Increases backend upload threshold to 10MB, wraps file handling in multer disk storage buffer, and adds client-side canvas-based JPEG optimizer prior to transmission.',
      riskNotes: samplePrDiffAnalysis,
    },
  });

  // 6. Seed Comments
  await prisma.comment.create({
    data: {
      issueId: issue1.id,
      userId: tester.id,
      message: 'Attached network HAR recording showing the 401 response loop before the blank render.',
    },
  });

  await prisma.comment.create({
    data: {
      issueId: issue1.id,
      userId: developer.id,
      message: 'Investigating axios response interceptor. Found that refresh token request was missing withCredentials header in cross-origin mode.',
    },
  });

  await prisma.comment.create({
    data: {
      issueId: issue3.id,
      userId: developer.id,
      message: 'PR #28419 created and ready for review. Bumped upload limit to 10MB and added canvas compression.',
    },
  });

  // 7. Seed Activities (Audit Trail)
  await prisma.activity.create({
    data: {
      issueId: issue1.id,
      userId: tester.id,
      action: 'CREATED',
      oldValue: null,
      newValue: 'FIN-101 created',
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue1.id,
      userId: admin.id,
      action: 'ASSIGNED',
      oldValue: 'Unassigned',
      newValue: developer.name,
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue1.id,
      userId: developer.id,
      action: 'STATUS_CHANGE',
      oldValue: 'OPEN',
      newValue: 'IN_PROGRESS',
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue3.id,
      userId: developer.id,
      action: 'PR_LINKED',
      oldValue: null,
      newValue: 'Linked PR #28419 (fix(uploads): increase multipart payload limit)',
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue3.id,
      userId: developer.id,
      action: 'STATUS_CHANGE',
      oldValue: 'IN_PROGRESS',
      newValue: 'READY_FOR_TESTING',
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue4.id,
      userId: tester.id,
      action: 'VERIFIED',
      oldValue: 'READY_FOR_TESTING',
      newValue: 'PASSED',
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue4.id,
      userId: tester.id,
      action: 'STATUS_CHANGE',
      oldValue: 'READY_FOR_TESTING',
      newValue: 'CLOSED',
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue5.id,
      userId: tester.id,
      action: 'VERIFIED',
      oldValue: 'READY_FOR_TESTING',
      newValue: 'FAILED',
    },
  });

  await prisma.activity.create({
    data: {
      issueId: issue5.id,
      userId: tester.id,
      action: 'STATUS_CHANGE',
      oldValue: 'READY_FOR_TESTING',
      newValue: 'REOPENED',
    },
  });

  // 8. Seed Verifications
  await prisma.verification.create({
    data: {
      issueId: issue4.id,
      testerId: tester.id,
      result: 'PASSED',
      testNotes: 'Tested with 25,000 transaction batch export on Chrome and Safari. Web Worker generated CSV smoothly in 850ms with zero UI lag.',
    },
  });

  await prisma.verification.create({
    data: {
      issueId: issue5.id,
      testerId: tester.id,
      result: 'FAILED',
      testNotes: 'Dark mode works initially, but when opening app in a fresh incognito tab or clearing cookies, light mode is forced and user preference is discarded.',
    },
  });

  console.log('✅ Pull Requests, Comments, Activities, and Verifications seeded successfully!');
  console.log('\n--- DEMO ACCOUNTS READY ---');
  console.log('Admin:     admin@bugtrack.ai     / Admin@123');
  console.log('Tester:    tester@bugtrack.ai    / Tester@123');
  console.log('Developer: developer@bugtrack.ai / Developer@123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
