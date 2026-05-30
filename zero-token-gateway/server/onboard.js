import { config, credentialStore, providerRegistry } from './index.js';
import { captureCredentials, connectToChrome } from './cdp/chrome.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  console.log('\n🔧 Zero Token Gateway - Onboarding Wizard\n');
  console.log('This wizard will help you capture credentials from AI platforms.\n');
  console.log('Make sure Chrome is running in debug mode first:');
  console.log('  npm run start-chrome-debug\n');

  const cdpPort = config.chrome?.cdpPort || 9222;

  try {
    await connectToChrome(cdpPort);
    console.log('✅ Connected to Chrome\n');
  } catch (err) {
    console.error('❌ Cannot connect to Chrome. Please start it first:');
    console.error('   npm run start-chrome-debug\n');
    process.exit(1);
  }

  const providers = providerRegistry.list();

  while (true) {
    console.log('\nAvailable providers:');
    providers.forEach((p, i) => {
      const cred = credentialStore.get(p.id);
      const status = cred ? '✅ configured' : '⬜ not configured';
      console.log(`  ${i + 1}. ${p.name} (${p.id}) - ${status}`);
    });
    console.log(`  0. Exit\n`);

    const choice = await question('Select provider to configure (number): ');
    const idx = parseInt(choice);

    if (idx === 0 || isNaN(idx)) {
      break;
    }

    const provider = providers[idx - 1];
    if (!provider) {
      console.log('Invalid choice.');
      continue;
    }

    console.log(`\n📡 Capturing credentials for ${provider.name}...`);
    console.log(`   URL: ${provider.authConfig.url}`);
    console.log('   Make sure you are logged in to this platform in Chrome.\n');

    try {
      const credentials = await captureCredentials(cdpPort, provider.authConfig);

      if (!credentials.cookie && !credentials.bearer) {
        console.log('⚠️  No credentials captured. Are you logged in?');
        const retry = await question('Retry? (y/n): ');
        if (retry.toLowerCase() === 'y') continue;
        else continue;
      }

      credentialStore.save(provider.id, credentials);
      console.log(`✅ Credentials saved for ${provider.name}`);
      console.log(`   Cookie: ${credentials.cookie ? '✅' : '❌'}`);
      console.log(`   Bearer: ${credentials.bearer ? '✅' : '❌'}`);
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }
  }

  console.log('\n✅ Onboarding complete!');
  console.log('Start the gateway with: npm start\n');
  rl.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Onboarding failed:', err);
  process.exit(1);
});
