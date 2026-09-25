/**
 * TOTP Service Resolver & Auto-Enrollment Test Suite
 * Tests brand resolution, favicon extraction, existing item matching, and automatic vault enrollment
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { resolveTOTPService, extractDomainFromUrlOrText, buildFaviconUrl } from '../services/totpServiceResolver';
import { findMatchingVaultItem, autoEnrollTOTP } from '../services/totpAutoEnrollment';
import { useVaultStore } from '../../vault/store/useVaultStore';
import { VaultItem, AnyVaultPayload, LoginPayload } from '../../../types/vault';

describe('TOTP Service & Icon Resolver', () => {
  it('resolves well-known brand presets with high fidelity', () => {
    const github = resolveTOTPService('GitHub', 'user@example.com');
    assert.strictEqual(github.title, 'GitHub');
    assert.strictEqual(github.domain, 'github.com');
    assert.strictEqual(github.websiteUrl, 'https://github.com');
    assert.strictEqual(github.icon, 'github');

    const google = resolveTOTPService('Google', 'user@gmail.com');
    assert.strictEqual(google.title, 'Google');
    assert.strictEqual(google.domain, 'google.com');
    assert.strictEqual(google.icon, 'google');

    const discord = resolveTOTPService('Discord');
    assert.strictEqual(discord.title, 'Discord');
    assert.strictEqual(discord.domain, 'discord.com');
    assert.strictEqual(discord.icon, 'discord');

    const aws = resolveTOTPService('Amazon Web Services');
    assert.strictEqual(aws.title, 'Amazon');
    assert.strictEqual(aws.domain, 'amazon.com');
  });

  it('resolves custom domains into favicon URLs', () => {
    const custom = resolveTOTPService('custom.example.org');
    assert.strictEqual(custom.title, 'Custom');
    assert.strictEqual(custom.domain, 'custom.example.org');
    assert.strictEqual(custom.websiteUrl, 'https://custom.example.org');
    assert.ok(custom.icon.includes('google.com/s2/favicons?domain=custom.example.org'));
  });

  it('extracts domain from account email when issuer is blank', () => {
    const fromEmail = resolveTOTPService('', 'developer@gitlab.com');
    assert.strictEqual(fromEmail.title, 'GitLab');
    assert.strictEqual(fromEmail.domain, 'gitlab.com');
  });

  it('extracts domain cleanly from various URL formats', () => {
    assert.strictEqual(extractDomainFromUrlOrText('https://sub.domain.co.uk/path?q=1'), 'sub.domain.co.uk');
    assert.strictEqual(extractDomainFromUrlOrText('http://www.google.com/search'), 'google.com');
    assert.strictEqual(extractDomainFromUrlOrText('accounts.google.com'), 'accounts.google.com');
  });

  it('builds standard high-resolution favicon links', () => {
    const link = buildFaviconUrl('github.com');
    assert.strictEqual(link, 'https://www.google.com/s2/favicons?domain=github.com&sz=128');
  });
});

describe('TOTP Existing Item Matcher', () => {
  const mockVaultItems: VaultItem<AnyVaultPayload>[] = [
    {
      id: 'item-gh-work',
      type: 'LOGIN',
      title: 'GitHub',
      isProtected: true,
      isFavorite: false,
      tags: ['work', 'dev'],
      icon: 'github',
      payload: {
        username: 'alexturner-dev',
        password: 'mockPassword123',
        websiteUrl: 'https://github.com',
      } as LoginPayload,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'item-google-personal',
      type: 'LOGIN',
      title: 'Google (Gmail)',
      isProtected: true,
      isFavorite: true,
      tags: ['personal'],
      icon: 'google',
      payload: {
        username: 'alex.turner@gmail.com',
        password: 'mockPassword456',
        websiteUrl: 'https://accounts.google.com',
      } as LoginPayload,
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  it('matches existing item by service title and username exactly', () => {
    const match = findMatchingVaultItem(mockVaultItems, {
      issuer: 'GitHub',
      account: 'alexturner-dev',
      secret: 'JBSWY3DPEHPK3PXP',
    });

    assert.notStrictEqual(match, null);
    assert.strictEqual(match?.id, 'item-gh-work');
  });

  it('matches existing item case-insensitively and through domain matching', () => {
    const match = findMatchingVaultItem(mockVaultItems, {
      issuer: 'google',
      account: 'Alex.Turner@gmail.com',
      secret: 'JBSWY3DPEHPK3PXP',
    });

    assert.notStrictEqual(match, null);
    assert.strictEqual(match?.id, 'item-google-personal');
  });

  it('does not match when account username differs completely', () => {
    const match = findMatchingVaultItem(mockVaultItems, {
      issuer: 'GitHub',
      account: 'completely_different_user',
      secret: 'JBSWY3DPEHPK3PXP',
    });

    assert.strictEqual(match, null);
  });

  it('returns null when no matching service exists in vault', () => {
    const match = findMatchingVaultItem(mockVaultItems, {
      issuer: 'Cloudflare',
      account: 'alex@example.com',
      secret: 'JBSWY3DPEHPK3PXP',
    });

    assert.strictEqual(match, null);
  });
});

describe('TOTP Auto-Enrollment Engine', () => {
  beforeEach(() => {
    useVaultStore.setState({
      items: [
        {
          id: 'existing-discord',
          type: 'LOGIN',
          title: 'Discord',
          isProtected: true,
          isFavorite: false,
          tags: ['social'],
          icon: 'discord',
          payload: {
            username: 'gamer_alex',
            password: 'secretPassword789',
            websiteUrl: 'https://discord.com',
          } as LoginPayload,
          createdAt: 3000,
          updatedAt: 3000,
        },
      ],
    });
  });

  it('links TOTP secret to matching existing vault item without overwriting other fields', async () => {
    const qrUri = 'otpauth://totp/Discord:gamer_alex?secret=JBSWY3DPEHPK3PXP&issuer=Discord';
    const result = await autoEnrollTOTP(qrUri);

    assert.strictEqual(result.action, 'linked_existing');
    assert.strictEqual(result.item.id, 'existing-discord');
    assert.ok(result.message.includes('linked'));

    // Check store state was updated
    const updatedStoreItem = useVaultStore.getState().items.find((i) => i.id === 'existing-discord');
    assert.notStrictEqual(updatedStoreItem, undefined);
    const p = updatedStoreItem?.payload as unknown as Record<string, unknown>;
    assert.strictEqual(p.totpSecret, 'JBSWY3DPEHPK3PXP');
    assert.strictEqual(p.password, 'secretPassword789'); // Preserved
    assert.strictEqual(p.username, 'gamer_alex'); // Preserved
  });

  it('creates brand new encrypted vault item when service does not exist in vault', async () => {
    const qrUri = 'otpauth://totp/Stripe:merchant@biz.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=Stripe';
    const result = await autoEnrollTOTP(qrUri);

    assert.strictEqual(result.action, 'created_new');
    assert.strictEqual(result.resolvedService.title, 'Stripe');
    assert.ok(result.message.includes('Created new'));

    // Verify item was committed to the vault store
    const storeItem = useVaultStore.getState().items.find((i) => i.id === result.item.id);
    assert.notStrictEqual(storeItem, undefined);
    assert.strictEqual(storeItem?.title, 'Stripe');
    assert.strictEqual(storeItem?.type, 'LOGIN');
    const p = storeItem?.payload as unknown as Record<string, unknown>;
    assert.strictEqual(p.totpSecret, 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ');
    assert.strictEqual(p.username, 'merchant@biz.com');
    assert.ok(storeItem?.tags.includes('totp'));
  });
});
