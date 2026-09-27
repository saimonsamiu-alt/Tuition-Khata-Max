import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing for API endpoints
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================================
// CYBER-SECURITY DEFENSE ENGINE & WEB APPLICATION FIREWALL (WAF / IDS / IPS)
// ============================================================================

// In-Memory Security Storage (Active IP Bans, Incident Logs, Rate Counters)
const bannedIps = new Map(); // ip -> { bannedAt, expiresAt, reason, attackCount, category }
const securityIncidents = []; // latest 200 incidents
const ipRequestMetrics = new Map(); // ip -> { requestCount, windowStart, attackCount }
let totalAttacksMitigated = 0;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

function banIpAddress(ip, reason = 'Automated Cyber Threat Mitigation', durationMinutes = 120, category = 'Malicious Probe') {
  const expiresAt = durationMinutes > 0 ? Date.now() + (durationMinutes * 60 * 1000) : null;
  const existing = bannedIps.get(ip) || { attackCount: 0 };
  const record = {
    ip,
    bannedAt: Date.now(),
    expiresAt,
    reason,
    category,
    attackCount: (existing.attackCount || 0) + 1
  };
  bannedIps.set(ip, record);
  return record;
}

function logSecurityIncident(req, attackType, payloadSummary, severity = 'HIGH', autoBanned = true) {
  totalAttacksMitigated++;
  const ip = getClientIp(req);
  const incident = {
    id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
    ip,
    userAgent: req.headers['user-agent'] || 'Unknown Browser/Scanner',
    method: req.method,
    path: req.originalUrl || req.url,
    attackType,
    payloadSummary: String(payloadSummary || '').substring(0, 300),
    severity,
    autoBanned,
    actionTaken: autoBanned ? 'IP Firewall Ban & Session Block' : 'Honeypot Decoy Trap & Quarantined'
  };

  securityIncidents.unshift(incident);
  if (securityIncidents.length > 200) securityIncidents.pop();

  if (autoBanned) {
    banIpAddress(ip, `${attackType} probe detected: ${payloadSummary}`, 180, attackType);
  }

  return incident;
}

// 1. Intrusion Detection & Firewall Middleware
app.use((req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();

  // Always allow security management endpoints to allow unbanning and incident review
  if (req.path.startsWith('/api/security/')) {
    return next();
  }

  // Check if IP is currently banned
  const banInfo = bannedIps.get(ip);
  if (banInfo) {
    if (!banInfo.expiresAt || banInfo.expiresAt > now) {
      const remainingMinutes = banInfo.expiresAt ? Math.ceil((banInfo.expiresAt - now) / 60000) : 'Permanent';
      res.status(403).setHeader('Content-Type', 'application/json');
      return res.json({
        error: 'FIREWALL_BLOCKED',
        title: '🛡️ সাইবার সিকিউরিটি ফায়ারওয়াল ব্লক',
        message: 'সিস্টেমে ক্ষতিকর বা অননুমোদিত আক্রমণের চেষ্টা শনাক্ত হওয়ায় আপনার আইপি অ্যাড্রেস সাময়িকভাবে ব্যান করা হয়েছে।',
        blockedIp: ip,
        reason: banInfo.reason,
        expiresInMinutes: remainingMinutes,
        incidentRef: 'TK-DEFENSE-' + (banInfo.attackCount || 1)
      });
    } else {
      // Ban has expired, unban
      bannedIps.delete(ip);
    }
  }

  // Rate Limiting & High-Frequency Probe Defense (DDoS / Brute-force Prevention)
  const windowMs = 60 * 1000; // 1 minute
  let metrics = ipRequestMetrics.get(ip);
  if (!metrics || (now - metrics.windowStart) > windowMs) {
    metrics = { requestCount: 1, windowStart: now, attackCount: 0 };
    ipRequestMetrics.set(ip, metrics);
  } else {
    metrics.requestCount++;
  }

  // If a single IP makes > 350 requests/min, temporarily throttle & ban
  if (metrics.requestCount > 350) {
    logSecurityIncident(req, 'DDoS / Aggressive Flooding', `${metrics.requestCount} requests/min`, 'CRITICAL', true);
    res.status(429).json({ error: 'TOO_MANY_REQUESTS', message: 'অতিরিক্ত অনুরোধের কারণে আইপি সাময়িক স্থগিত।' });
    return;
  }

  // 2. Scan URL path and Query for Malicious Exploit Signatures
  const rawUrl = decodeURIComponent(req.originalUrl || req.url || '').toLowerCase();
  
  // High-Risk Scanner/Backdoor Probes
  const reconScanners = [
    '/.env', '/.git', '/wp-admin', '/phpmyadmin', '/xmlrpc.php',
    '/etc/passwd', '/proc/self', '/eval-stdin', '/actuator', '/.aws',
    '/cgi-bin', '/shell', '/telescope', '/config.json', '/vendor/phpunit'
  ];
  if (reconScanners.some(p => rawUrl.includes(p))) {
    logSecurityIncident(req, 'Automated Vulnerability Scanner', `Probing: ${rawUrl}`, 'HIGH', true);
    return res.status(403).send('Access Denied by TuitionKhata Firewall');
  }

  // Path Traversal Probes
  if (rawUrl.includes('../') || rawUrl.includes('..\\')) {
    logSecurityIncident(req, 'Directory / Path Traversal Attack', `Traversal path: ${rawUrl}`, 'CRITICAL', true);
    return res.status(403).send('Forbidden: Path Traversal Detected');
  }

  // SQL Injection Signatures in URL / Query
  const sqlKeywords = [
    "' or '1'='1", "' or 1=1", "union select", "drop table",
    "waitfor delay", "benchmark(", "sleep(", ";--", "information_schema"
  ];
  if (sqlKeywords.some(kw => rawUrl.includes(kw))) {
    logSecurityIncident(req, 'SQL Injection Probe', `SQL query probe: ${rawUrl}`, 'CRITICAL', true);
    return res.status(403).send('Forbidden: SQL Injection Attack Detected');
  }

  // XSS / Remote Code Execution in URL
  if (rawUrl.includes('<script') || rawUrl.includes('javascript:') || rawUrl.includes('onerror=')) {
    logSecurityIncident(req, 'Cross-Site Scripting (XSS) Attack', `Payload: ${rawUrl}`, 'HIGH', true);
    return res.status(403).send('Forbidden: XSS Payload Detected');
  }

  next();
});

// ============================================================================
// SECURITY API ENDPOINTS (REPORT THREAT, AUDIT LOGS, IP CONTROL)
// ============================================================================

// Endpoint for Client-Side Detection reporting (Honeypot triggers, Form SQLi, Script tampering)
app.post('/api/security/report-threat', (req, res) => {
  const { threatType, payload, honeypotTriggered, clientInfo } = req.body || {};
  const ip = getClientIp(req);
  
  const incident = logSecurityIncident(
    req,
    threatType || 'Client-Side Exploit Attempt',
    `Payload: ${payload || 'Honeypot Triggered'} | Details: ${JSON.stringify(clientInfo || {})}`,
    honeypotTriggered ? 'CRITICAL' : 'HIGH',
    true // Immediately auto-ban attacker's IP
  );

  res.json({
    status: 'defended',
    message: 'Threat recorded and defensive countermeasure executed.',
    incidentId: incident.id,
    ipBanned: true
  });
});

// Master Admin Hash for Securing Administrative Endpoints
const ADMIN_MASTER_HASH = 'e5170ec0a51622c2f9fbc1a1498acaa560b501ef2a0835d125364d257d1ddf03';

function isAuthorizedAdmin(req) {
  const token = req.headers['x-admin-token'] || req.headers['authorization'] || req.query.token;
  if (token === ADMIN_MASTER_HASH || token === 'Bearer ' + ADMIN_MASTER_HASH) return true;
  const ip = getClientIp(req);
  if (ip === '127.0.0.1' || ip === '::1') return true;
  return false;
}

// Endpoint to retrieve Security Status & Incident Logs
app.get('/api/security/incidents', (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'অননুমোদিত অ্যাক্সেস: অ্যাডমিন টোকেন আবশ্যক।' });
  }

  const activeBans = [];
  const now = Date.now();
  for (const [ip, data] of bannedIps.entries()) {
    if (!data.expiresAt || data.expiresAt > now) {
      activeBans.push({
        ip,
        ...data,
        remainingMinutes: data.expiresAt ? Math.ceil((data.expiresAt - now) / 60000) : 'Permanent'
      });
    }
  }

  res.json({
    firewallActive: true,
    totalMitigated: totalAttacksMitigated,
    activeBansCount: activeBans.length,
    activeBans,
    recentIncidents: securityIncidents.slice(0, 50)
  });
});

// Admin Manual IP Ban
app.post('/api/security/ban-ip', (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'অননুমোদিত অ্যাক্সেস: অ্যাডমিন টোকেন আবশ্যক।' });
  }
  const { ip, reason, durationMinutes } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'IP address is required' });
  const result = banIpAddress(ip.trim(), reason || 'Admin Manual Security Enforcement', durationMinutes || 1440, 'Manual Ban');
  res.json({ status: 'ok', message: `IP ${ip} has been successfully banned.`, record: result });
});

// Admin Manual IP Unban
app.post('/api/security/unban-ip', (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'অননুমোদিত অ্যাক্সেস: অ্যাডমিন টোকেন আবশ্যক।' });
  }
  const { ip } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'IP address is required' });
  bannedIps.delete(ip.trim());
  res.json({ status: 'ok', message: `IP ${ip} has been unbanned.` });
});

// ============================================================================
// ASSETS & STATIC SERVING WITH COMPRESSION
// ============================================================================

// Enable gzip/deflate compression for all responses
app.use(compression({
  threshold: 1024,
  level: 6
}));

// Serve static assets with caching headers for high performance
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  etag: true,
  lastModified: true,
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    // Security Headers on all static responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (filePath.endsWith('.html') || filePath.endsWith('/')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.svg') || filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    }
  }
}));

// Fallback to index.html for any unhandled routes
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TuitionKhata WAF & Security Server running at http://0.0.0.0:${PORT}`);
});

