import fs from 'fs';
import path from 'path';

export class CredentialStore {
  constructor(dir) {
    this.dir = dir;
    this.credentials = {};
  }

  async load() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
      return;
    }
    const files = fs.readdirSync(this.dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const provider = file.replace('.json', '');
      this.credentials[provider] = JSON.parse(fs.readFileSync(path.join(this.dir, file), 'utf-8'));
    }
  }

  save(provider, data) {
    this.credentials[provider] = { ...data, updatedAt: Date.now() };
    fs.writeFileSync(
      path.join(this.dir, `${provider}.json`),
      JSON.stringify(this.credentials[provider], null, 2)
    );
  }

  get(provider) {
    return this.credentials[provider] || null;
  }

  remove(provider) {
    delete this.credentials[provider];
    const filePath = path.join(this.dir, `${provider}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  list() {
    const result = {};
    for (const [key, val] of Object.entries(this.credentials)) {
      result[key] = {
        provider: key,
        updatedAt: val.updatedAt,
        hasCookie: !!val.cookie,
        hasBearer: !!val.bearer
      };
    }
    return result;
  }

  isExpired(provider, maxAgeMs = 3600000) {
    const cred = this.credentials[provider];
    if (!cred || !cred.updatedAt) return true;
    return Date.now() - cred.updatedAt > maxAgeMs;
  }
}
