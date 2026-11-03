const axios = require('axios');
const config = require('../config');

class GeminiService {
  constructor() {
    this.apiKey = config.GEMINI_API_KEY;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Structure raw bug input into comprehensive bug report
   */
  async structureBugReport(rawInput) {
    if (this.isConfigured()) {
      try {
        const prompt = `You are a Senior QA Automation Architect and Software Reliability Engineer.
Given the following raw bug description from a tester or user, generate a structured bug report in strictly valid JSON format.
Do not include markdown triple backticks. Return only pure JSON with this structure:
{
  "title": "Concise imperative bug title (e.g. Blank screen when saving profile photo)",
  "summary": "Clear executive summary of the issue",
  "stepsToReproduce": "Numbered step-by-step reproduction instructions",
  "expectedResult": "What should have happened",
  "actualResult": "What actually happened / error observed",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "environment": "Suggested environment (e.g. Web Browser / Mobile / Backend API)",
  "labels": ["array", "of", "relevant", "tags"],
  "reasoning": "Brief explanation of severity and priority assessment"
}

Raw Bug Description:
"${rawInput}"`;

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          },
          { timeout: 12000 }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            ...parsed,
            isFallback: false,
            engine: 'Google Gemini 1.5 Flash',
          };
        }
      } catch (err) {
        console.warn('Gemini API call failed, switching to local fallback engine:', err.message);
      }
    }

    // Local Fallback Analysis Engine
    return this.fallbackStructureBugReport(rawInput);
  }

  /**
   * Local Deterministic Fallback Engine for Bug Report Generation
   */
  fallbackStructureBugReport(rawInput) {
    const text = (rawInput || '').trim();
    const lower = text.toLowerCase();

    // Determine severity
    let severity = 'MEDIUM';
    let priority = 'MEDIUM';
    let reasoning = 'Standard UI/functionality issue based on text keywords.';

    if (
      lower.includes('crash') ||
      lower.includes('blank screen') ||
      lower.includes('white screen') ||
      lower.includes('data loss') ||
      lower.includes('freeze') ||
      lower.includes('security') ||
      lower.includes('double charge') ||
      lower.includes('payment') ||
      lower.includes('corrupt')
    ) {
      severity = 'CRITICAL';
      priority = 'HIGH';
      reasoning = 'Critical issue detected: mentions application freeze, white screen, data loss, security or transaction risk.';
    } else if (
      lower.includes('error') ||
      lower.includes('fail') ||
      lower.includes('cannot') ||
      lower.includes('unable') ||
      lower.includes('exception') ||
      lower.includes('timeout') ||
      lower.includes('404') ||
      lower.includes('500')
    ) {
      severity = 'HIGH';
      priority = 'HIGH';
      reasoning = 'High severity: core functionality fails or throws unhandled error.';
    } else if (
      lower.includes('typo') ||
      lower.includes('color') ||
      lower.includes('font') ||
      lower.includes('alignment') ||
      lower.includes('dark mode') ||
      lower.includes('icon')
    ) {
      severity = 'LOW';
      priority = 'LOW';
      reasoning = 'Low severity: cosmetic, layout or non-blocking presentation issue.';
    }

    // Determine title
    let title = 'Unexpected application error during user workflow';
    if (text.length > 0) {
      const firstSentence = text.split(/[.\n]/)[0].trim();
      if (firstSentence.length > 5 && firstSentence.length <= 90) {
        title = firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
      } else if (firstSentence.length > 90) {
        title = firstSentence.slice(0, 87) + '...';
      }
    }

    // Infer reproduction steps
    const steps = [
      '1. Open the application and authenticate with standard user credentials.',
      `2. Navigate to the feature area referenced: "${text.slice(0, 60)}..."`,
      '3. Perform the triggering action described by the reporter.',
      '4. Observe the unexpected error state or UI malfunction.',
    ].join('\n');

    // Labels
    const labels = ['ai-structured', 'bug'];
    if (lower.includes('ui') || lower.includes('page') || lower.includes('screen')) labels.push('frontend');
    if (lower.includes('api') || lower.includes('server') || lower.includes('database')) labels.push('backend');
    if (lower.includes('auth') || lower.includes('login') || lower.includes('token')) labels.push('security');
    if (lower.includes('performance') || lower.includes('slow') || lower.includes('freeze')) labels.push('performance');

    return {
      title,
      summary: text || 'User encountered an unexpected anomaly during execution.',
      stepsToReproduce: steps,
      expectedResult: 'The application should complete the requested operation successfully without UI freezing or uncaught exceptions.',
      actualResult: text || 'The requested operation failed unexpectedly.',
      severity,
      priority,
      environment: 'Web Browser (Chrome / Firefox / Edge)',
      labels,
      reasoning,
      isFallback: true,
      engine: 'BugTrack Local Deterministic Fallback Engine',
    };
  }

  /**
   * Suggest Priority with rationale
   */
  async suggestPriority(issueDetails) {
    const { title = '', description = '', severity = 'MEDIUM' } = issueDetails;
    const combined = `${title} ${description}`.toLowerCase();

    let suggestedPriority = 'MEDIUM';
    let rationale = 'Default moderate priority for standard functional bugs.';

    if (severity === 'CRITICAL' || combined.includes('payment') || combined.includes('security') || combined.includes('crash')) {
      suggestedPriority = 'CRITICAL';
      rationale = 'Urgent attention required: potential revenue loss, security impact, or application crash preventing core user journeys.';
    } else if (severity === 'HIGH' || combined.includes('blocked') || combined.includes('cannot complete')) {
      suggestedPriority = 'HIGH';
      rationale = 'High priority: major user feature blocked without intuitive workaround.';
    } else if (severity === 'LOW' || combined.includes('cosmetic') || combined.includes('style') || combined.includes('typo')) {
      suggestedPriority = 'LOW';
      rationale = 'Minor priority: cosmetic issue or minor edge case that does not affect system stability.';
    }

    return {
      suggestedPriority,
      rationale,
      isFallback: !this.isConfigured(),
      engine: this.isConfigured() ? 'Google Gemini 1.5 Flash' : 'BugTrack Local Deterministic Fallback Engine',
    };
  }

  /**
   * AI Code Change Risk Analysis
   */
  async analyzeCodeChangeRisk(prData, issueData) {
    if (this.isConfigured()) {
      try {
        const prompt = `You are a Principal Software Reliability Engineer and Security Auditor.
Analyze this GitHub Pull Request and its corresponding Bug Report to assess risk and generate regression test recommendations.
Return strictly valid JSON with no markdown formatting:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "changeSummary": "Concise summary of the developer's code change",
  "affectedModules": ["Array", "of", "impacted", "modules"],
  "potentialRisks": ["Array", "of", "specific", "potential", "regression", "risks"],
  "suggestedRegressionTests": ["Array", "of", "concrete", "step-by-step", "test", "cases"],
  "missingScenarios": ["Array", "of", "edge", "cases", "or", "missing", "scenarios"],
  "rationale": "Clear technical rationale for the assigned risk level"
}

Bug Details:
Key: ${issueData.issueKey || 'N/A'}
Title: ${issueData.title || 'N/A'}
Description: ${issueData.description || 'N/A'}

PR Details:
Repository: ${prData.repository || 'N/A'}
PR Number: #${prData.prNumber || 'N/A'}
PR Title: ${prData.title || 'N/A'}
Changed Files: ${JSON.stringify(prData.changedFiles || [])}
PR Body/Diff: ${prData.body || 'N/A'}`;

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          },
          { timeout: 15000 }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            ...parsed,
            isFallback: false,
            engine: 'Google Gemini 1.5 Flash',
            disclaimer: 'AI-generated assessment for developer and QA review. Does not claim automated test execution without test harness confirmation.',
          };
        }
      } catch (err) {
        console.warn('Gemini PR risk analysis failed, falling back:', err.message);
      }
    }

    return this.fallbackCodeChangeRisk(prData, issueData);
  }

  /**
   * Deterministic Fallback Engine for PR Code Change Risk Analysis
   */
  fallbackCodeChangeRisk(prData, issueData) {
    const files = Array.isArray(prData.changedFiles)
      ? prData.changedFiles
      : typeof prData.changedFiles === 'string'
      ? JSON.parse(prData.changedFiles || '[]')
      : [];

    const prTitle = (prData.title || '').toLowerCase();
    const issueTitle = (issueData?.title || '').toLowerCase();
    const combined = `${prTitle} ${issueTitle}`;

    let riskLevel = 'LOW';
    const potentialRisks = [];
    const affectedModules = [];
    const suggestedRegressionTests = [];
    const missingScenarios = [];

    // Analyze changed files
    let hasBackendChanges = false;
    let hasDatabaseChanges = false;
    let hasAuthChanges = false;
    let hasConfigChanges = false;

    files.forEach((file) => {
      const f = (typeof file === 'string' ? file : file.filename || file.name || '').toLowerCase();
      affectedModules.push(file);

      if (f.includes('auth') || f.includes('jwt') || f.includes('login') || f.includes('token') || f.includes('security')) {
        hasAuthChanges = true;
      }
      if (f.includes('schema') || f.includes('prisma') || f.includes('migration') || f.includes('db') || f.includes('sql')) {
        hasDatabaseChanges = true;
      }
      if (f.includes('server') || f.includes('controller') || f.includes('middleware') || f.includes('service') || f.includes('api')) {
        hasBackendChanges = true;
      }
      if (f.includes('config') || f.includes('.env') || f.includes('docker') || f.includes('package.json')) {
        hasConfigChanges = true;
      }
    });

    if (hasAuthChanges || hasDatabaseChanges || files.length > 8 || combined.includes('auth') || combined.includes('payment')) {
      riskLevel = 'HIGH';
      potentialRisks.push('High-risk module modifications in authentication, session, or database layer');
      potentialRisks.push('Potential regression in data schema consistency or user access control permissions');
    } else if (hasBackendChanges || files.length > 3 || hasConfigChanges) {
      riskLevel = 'MEDIUM';
      potentialRisks.push('Backend API contract adjustments may affect front-end payload serialization');
      potentialRisks.push('Boundary condition handling under high concurrency or latency');
    } else {
      riskLevel = 'LOW';
      potentialRisks.push('Client-side cosmetic or localized component logic modification');
      potentialRisks.push('Minimal blast radius restricted to target visual component');
    }

    // Default affected modules if empty
    if (affectedModules.length === 0) {
      affectedModules.push('CoreApplicationModule', 'UserInterfaceComponent');
    }

    // Generate suggested regression tests
    suggestedRegressionTests.push(`Verify the primary reported defect (${issueData?.issueKey || 'Issue'}: "${issueData?.title || 'Bug'}") is thoroughly resolved.`);
    if (hasAuthChanges) {
      suggestedRegressionTests.push('Verify session renewal, token expiry handling, and protected route access control.');
      suggestedRegressionTests.push('Verify logout clears local credentials and invalidates JWT state.');
    }
    if (hasDatabaseChanges) {
      suggestedRegressionTests.push('Verify database query response times, transaction integrity, and null constraint handling.');
    }
    suggestedRegressionTests.push('Perform end-to-end user journey across affected components to ensure zero console regressions.');
    suggestedRegressionTests.push('Verify UI rendering and responsiveness across modern mobile and desktop viewport sizes.');

    // Missing scenarios
    missingScenarios.push('Simulated slow 3G network conditions and server request timeout edge cases.');
    missingScenarios.push('Rapid multiple button clicks / idempotency handling on form submission.');
    if (hasBackendChanges) {
      missingScenarios.push('Malformed payload input rejection with friendly user-facing validation errors.');
    }

    return {
      riskLevel,
      changeSummary: `PR #${prData.prNumber || ''}: "${prData.title || 'Code Update'}" touches ${files.length} file(s) across target repository.`,
      affectedModules: affectedModules.slice(0, 10),
      potentialRisks,
      suggestedRegressionTests,
      missingScenarios,
      rationale: `Assigned ${riskLevel} risk based on file blast radius (${files.length} files affected) and domain sensitivity (Database: ${hasDatabaseChanges}, Auth: ${hasAuthChanges}, Backend: ${hasBackendChanges}).`,
      isFallback: true,
      engine: 'BugTrack Local Deterministic Fallback Engine',
      disclaimer: 'AI-generated assessment for developer and QA review. Does not claim automated test execution without test harness confirmation.',
    };
  }
}

module.exports = new GeminiService();
