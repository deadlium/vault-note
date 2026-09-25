/**
 * TOTP Service & Icon Resolver
 * Automatically resolves brand names, domain URLs, and high-resolution icons for TOTP issuers
 */

export interface ResolvedTOTPService {
  title: string;
  domain?: string;
  websiteUrl?: string;
  icon: string;
  category: 'LOGIN' | 'TOTP';
}

interface ServicePreset {
  title: string;
  domain: string;
  iconKey?: string;
  aliases: string[];
}

const SERVICE_PRESETS: ServicePreset[] = [
  { title: 'Google', domain: 'google.com', iconKey: 'google', aliases: ['google', 'gmail', 'googlemail', 'youtube', 'alphabet'] },
  { title: 'GitHub', domain: 'github.com', iconKey: 'github', aliases: ['github'] },
  { title: 'Discord', domain: 'discord.com', iconKey: 'discord', aliases: ['discord', 'discordapp'] },
  { title: 'Microsoft', domain: 'microsoft.com', iconKey: 'microsoft', aliases: ['microsoft', 'azure', 'office365', 'outlook', 'live', 'msft'] },
  { title: 'Amazon', domain: 'amazon.com', iconKey: 'amazon', aliases: ['amazon', 'aws', 'amazonwebservices'] },
  { title: 'Apple', domain: 'apple.com', iconKey: 'apple', aliases: ['apple', 'icloud', 'itunes'] },
  { title: 'Netflix', domain: 'netflix.com', iconKey: 'netflix', aliases: ['netflix'] },
  { title: 'Twitter / X', domain: 'twitter.com', iconKey: 'twitter', aliases: ['twitter', 'x.com', 'x corp'] },
  { title: 'Spotify', domain: 'spotify.com', iconKey: 'spotify', aliases: ['spotify'] },
  { title: 'Slack', domain: 'slack.com', iconKey: 'slack', aliases: ['slack'] },
  { title: 'Dropbox', domain: 'dropbox.com', iconKey: 'dropbox', aliases: ['dropbox'] },
  { title: 'Reddit', domain: 'reddit.com', iconKey: 'reddit', aliases: ['reddit'] },
  { title: 'GitLab', domain: 'gitlab.com', aliases: ['gitlab'] },
  { title: 'Bitbucket', domain: 'bitbucket.org', aliases: ['bitbucket', 'atlassian'] },
  { title: 'Coinbase', domain: 'coinbase.com', aliases: ['coinbase'] },
  { title: 'Binance', domain: 'binance.com', aliases: ['binance'] },
  { title: 'Proton', domain: 'proton.me', aliases: ['proton', 'protonmail'] },
  { title: 'Twitch', domain: 'twitch.tv', aliases: ['twitch'] },
  { title: 'Cloudflare', domain: 'cloudflare.com', aliases: ['cloudflare'] },
  { title: 'Stripe', domain: 'stripe.com', aliases: ['stripe'] },
  { title: 'PayPal', domain: 'paypal.com', aliases: ['paypal'] },
  { title: 'Meta', domain: 'facebook.com', aliases: ['meta', 'facebook', 'fb'] },
  { title: 'Instagram', domain: 'instagram.com', aliases: ['instagram', 'ig'] },
  { title: 'Steam', domain: 'steampowered.com', aliases: ['steam', 'valve'] },
  { title: 'Epic Games', domain: 'epicgames.com', aliases: ['epic', 'epicgames'] },
  { title: 'Uber', domain: 'uber.com', aliases: ['uber'] },
  { title: 'Airbnb', domain: 'airbnb.com', aliases: ['airbnb'] },
  { title: 'Notion', domain: 'notion.so', aliases: ['notion'] },
  { title: 'Figma', domain: 'figma.com', aliases: ['figma'] },
];

export function extractDomainFromUrlOrText(input: string): string {
  if (!input) return '';
  let clean = input.trim().toLowerCase();
  clean = clean.replace(/^(https?:\/\/)?(www\.)?/, '');
  const domainPart = clean.split('/')[0].split('?')[0].split(':')[0];
  return domainPart;
}

export function buildFaviconUrl(domain: string): string {
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Resolves title, domain, website URL, and icon for a given TOTP issuer string.
 */
export function resolveTOTPService(
  rawIssuer: string,
  rawAccount?: string
): ResolvedTOTPService {
  let cleaned = (rawIssuer || '').trim();

  // If issuer is empty, try to extract from account if it contains domain
  if (!cleaned && rawAccount) {
    if (rawAccount.includes('@')) {
      const parts = rawAccount.split('@');
      if (parts[1]) {
        cleaned = parts[1].split('.')[0];
      }
    }
  }

  if (!cleaned) {
    return {
      title: 'Authenticator',
      icon: 'shield-checkmark',
      category: 'LOGIN',
    };
  }

  const lower = cleaned.toLowerCase();

  // 1. Check known presets
  for (const preset of SERVICE_PRESETS) {
    const matchesPreset =
      lower === preset.title.toLowerCase() ||
      preset.aliases.some((alias) => lower.includes(alias) || alias.includes(lower));

    if (matchesPreset) {
      return {
        title: preset.title,
        domain: preset.domain,
        websiteUrl: `https://${preset.domain}`,
        icon: preset.iconKey || buildFaviconUrl(preset.domain),
        category: 'LOGIN',
      };
    }
  }

  // 2. Check if the issuer looks like a domain name
  if (cleaned.includes('.') && !cleaned.includes(' ')) {
    const domain = extractDomainFromUrlOrText(cleaned);
    const domainName = domain.split('.')[0];
    const formattedTitle = domainName.charAt(0).toUpperCase() + domainName.slice(1);
    return {
      title: formattedTitle,
      domain,
      websiteUrl: `https://${domain}`,
      icon: buildFaviconUrl(domain),
      category: 'LOGIN',
    };
  }

  // 3. Fallback: Formatted title with guessed domain favicon
  const cleanAlpha = cleaned.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const guessedDomain = cleanAlpha ? `${cleanAlpha}.com` : undefined;

  return {
    title: cleaned,
    domain: guessedDomain,
    websiteUrl: guessedDomain ? `https://${guessedDomain}` : undefined,
    icon: guessedDomain ? buildFaviconUrl(guessedDomain) : 'shield-checkmark',
    category: 'LOGIN',
  };
}
