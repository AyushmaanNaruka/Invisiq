/**
 * built-in-templates.ts — Phase 4 / Sprint 16
 *
 * 20 built-in prompt templates organized by category.
 * Variables use {{variable_name}} syntax — substituted at use time.
 */

import type { PromptTemplate } from '@shared/types';

export const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  // ── Coding ───────────────────────────────────────────────────────────────
  {
    id: 'bt-code-review',
    name: 'Code Review',
    description: 'Thorough code review with actionable feedback',
    category: 'coding',
    prompt: 'Please review the following {{language}} code. Check for:\n1. Logic errors and bugs\n2. Performance issues\n3. Security vulnerabilities\n4. Code style and readability\n5. Missing edge cases\n\nProvide specific, actionable feedback:\n\n```{{language}}\n{{code}}\n```',
    variables: [
      { name: 'language', label: 'Language', placeholder: 'python', required: true },
      { name: 'code', label: 'Code', placeholder: 'Paste your code here', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['code', 'review', 'quality'],
  },
  {
    id: 'bt-explain-code',
    name: 'Explain Code',
    description: 'Get a clear explanation of what code does',
    category: 'coding',
    prompt: 'Explain this {{language}} code in clear, simple terms. Describe:\n1. What it does overall\n2. How each section works\n3. Any important patterns or algorithms used\n4. Potential improvements\n\n```{{language}}\n{{code}}\n```',
    variables: [
      { name: 'language', label: 'Language', placeholder: 'javascript', required: true },
      { name: 'code', label: 'Code', placeholder: 'Paste your code here', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['code', 'explain', 'learning'],
  },
  {
    id: 'bt-fix-bug',
    name: 'Fix Bug',
    description: 'Identify and fix a specific bug',
    category: 'debugging',
    prompt: 'I have a bug in my {{language}} code. \n\nExpected behavior: {{expected}}\nActual behavior: {{actual}}\n\nCode:\n```{{language}}\n{{code}}\n```\n\nPlease identify the root cause and provide a fixed version with explanation.',
    variables: [
      { name: 'language', label: 'Language', placeholder: 'typescript', required: true },
      { name: 'expected', label: 'Expected Behavior', placeholder: 'What should happen', required: true },
      { name: 'actual', label: 'Actual Behavior', placeholder: 'What actually happens', required: true },
      { name: 'code', label: 'Code', placeholder: 'Paste your buggy code', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['debug', 'fix', 'bug'],
  },
  {
    id: 'bt-leetcode',
    name: 'Solve Algorithm Problem',
    description: 'Solve a coding challenge with multiple approaches',
    category: 'coding',
    prompt: 'Solve this algorithm problem:\n\n{{problem}}\n\nProvide:\n1. Brute force approach (explain, then code)\n2. Optimal approach (explain, then code)\n3. Time and space complexity for each\n4. 2-3 test cases including edge cases\n\nUse {{language}} unless specified otherwise.',
    variables: [
      { name: 'problem', label: 'Problem Statement', placeholder: 'Describe the problem', required: true },
      { name: 'language', label: 'Language', placeholder: 'python', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['algorithm', 'leetcode', 'interview'],
  },
  {
    id: 'bt-write-tests',
    name: 'Write Unit Tests',
    description: 'Generate comprehensive unit tests for code',
    category: 'coding',
    prompt: 'Write comprehensive unit tests for the following {{language}} code using {{framework}}.\n\nInclude tests for:\n- Happy path scenarios\n- Edge cases\n- Error conditions\n- Boundary values\n\n```{{language}}\n{{code}}\n```',
    variables: [
      { name: 'language', label: 'Language', placeholder: 'javascript', required: true },
      { name: 'framework', label: 'Test Framework', placeholder: 'Jest', required: false },
      { name: 'code', label: 'Code to Test', placeholder: 'Paste your code here', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['testing', 'unit-tests', 'quality'],
  },

  // ── Writing ───────────────────────────────────────────────────────────────
  {
    id: 'bt-email-professional',
    name: 'Professional Email',
    description: 'Write a clear, professional email',
    category: 'writing',
    prompt: 'Write a professional email for the following situation:\n\nContext: {{context}}\nTone: {{tone}}\nKey points to cover: {{points}}\n\nMake it concise, clear, and professional. Include a subject line.',
    variables: [
      { name: 'context', label: 'Context / Purpose', placeholder: 'e.g., Following up on job application', required: true },
      { name: 'tone', label: 'Tone', placeholder: 'formal / friendly / urgent', required: false },
      { name: 'points', label: 'Key Points', placeholder: 'Main things to convey', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['email', 'writing', 'professional'],
  },
  {
    id: 'bt-summarize',
    name: 'Summarize Text',
    description: 'Get a concise summary of any text',
    category: 'analysis',
    prompt: 'Summarize the following text in {{length}}:\n\nRequirements:\n- Keep the most important points\n- Use clear, simple language\n- Maintain the original meaning\n\nText:\n{{text}}',
    variables: [
      { name: 'length', label: 'Summary Length', placeholder: '3-5 bullet points', required: false },
      { name: 'text', label: 'Text to Summarize', placeholder: 'Paste text here', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['summary', 'analysis', 'writing'],
  },
  {
    id: 'bt-improve-writing',
    name: 'Improve Writing',
    description: 'Polish and improve writing quality',
    category: 'writing',
    prompt: 'Improve the following text. Goals:\n- Fix grammar and spelling errors\n- Improve clarity and flow\n- Make it more {{style}}\n- Keep the original meaning and voice\n\nOriginal text:\n{{text}}\n\nProvide the improved version and explain the key changes made.',
    variables: [
      { name: 'style', label: 'Style Goal', placeholder: 'concise / engaging / formal', required: false },
      { name: 'text', label: 'Text to Improve', placeholder: 'Paste your text here', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['writing', 'grammar', 'editing'],
  },

  // ── Analysis ──────────────────────────────────────────────────────────────
  {
    id: 'bt-pros-cons',
    name: 'Pros & Cons Analysis',
    description: 'Balanced analysis of any decision or topic',
    category: 'analysis',
    prompt: 'Provide a balanced pros and cons analysis of: {{topic}}\n\nContext: {{context}}\n\nFormat as:\n**Pros:**\n- [list pros]\n\n**Cons:**\n- [list cons]\n\n**Recommendation:** [brief recommendation based on the analysis]',
    variables: [
      { name: 'topic', label: 'Topic / Decision', placeholder: 'e.g., Switching to React from Vue', required: true },
      { name: 'context', label: 'Context', placeholder: 'Any relevant background', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['analysis', 'decision', 'comparison'],
  },
  {
    id: 'bt-compare',
    name: 'Compare Options',
    description: 'Side-by-side comparison of two or more options',
    category: 'analysis',
    prompt: 'Compare the following options in the context of {{context}}:\n\nOptions: {{options}}\n\nCompare on these dimensions:\n{{dimensions}}\n\nPresent as a comparison table, then give a final recommendation.',
    variables: [
      { name: 'context', label: 'Context / Use Case', placeholder: 'e.g., building a REST API', required: true },
      { name: 'options', label: 'Options to Compare', placeholder: 'e.g., Express vs Fastify vs Hono', required: true },
      { name: 'dimensions', label: 'Comparison Dimensions', placeholder: 'performance, ease of use, ecosystem', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['comparison', 'analysis', 'decision'],
  },

  // ── Meeting ───────────────────────────────────────────────────────────────
  {
    id: 'bt-meeting-talking-points',
    name: 'Meeting Talking Points',
    description: 'Generate talking points for a meeting',
    category: 'meeting',
    prompt: 'Generate concise talking points for a meeting about: {{topic}}\n\nMeeting type: {{type}}\nDuration: {{duration}}\nAudience: {{audience}}\n\nProvide:\n1. Opening (30 seconds)\n2. Main points (3-5 bullets each with supporting detail)\n3. Questions to ask\n4. Closing / next steps',
    variables: [
      { name: 'topic', label: 'Meeting Topic', placeholder: 'e.g., Q4 roadmap planning', required: true },
      { name: 'type', label: 'Meeting Type', placeholder: 'e.g., team standup / client presentation', required: false },
      { name: 'duration', label: 'Duration', placeholder: 'e.g., 30 minutes', required: false },
      { name: 'audience', label: 'Audience', placeholder: 'e.g., engineering team', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['meeting', 'presentation', 'preparation'],
  },
  {
    id: 'bt-answer-question',
    name: 'Quick Answer',
    description: 'Get a clear answer to a specific question',
    category: 'meeting',
    prompt: 'I need to answer this question in a meeting:\n\n"{{question}}"\n\nContext: {{context}}\n\nProvide:\n1. A concise, confident answer (2-3 sentences)\n2. Supporting details or data points\n3. A follow-up action I can offer\n\nKeep it professional and clear.',
    variables: [
      { name: 'question', label: 'The Question', placeholder: 'Paste the question here', required: true },
      { name: 'context', label: 'Context', placeholder: 'Any relevant background', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['meeting', 'answer', 'quick'],
  },

  // ── Exam ──────────────────────────────────────────────────────────────────
  {
    id: 'bt-solve-question',
    name: 'Solve Exam Question',
    description: 'Get a direct answer to an exam question',
    category: 'exam',
    prompt: 'Solve this exam question:\n\n{{question}}\n\nProvide:\n1. ANSWER FIRST (bold, clear)\n2. Step-by-step solution\n3. Key formula/theorem used (if applicable)\n4. Common mistakes to avoid',
    variables: [
      { name: 'question', label: 'Exam Question', placeholder: 'Paste the question here', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['exam', 'answer', 'academic'],
  },
  {
    id: 'bt-multiple-choice',
    name: 'Multiple Choice',
    description: 'Identify the correct answer with explanation',
    category: 'exam',
    prompt: 'For this multiple choice question, identify the correct answer:\n\n{{question}}\n\nOptions:\n{{options}}\n\nState the correct option immediately, then explain WHY it is correct and why each incorrect option is wrong.',
    variables: [
      { name: 'question', label: 'Question', placeholder: 'The question text', required: true },
      { name: 'options', label: 'Options', placeholder: 'A) ... B) ... C) ... D) ...', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['exam', 'multiple-choice', 'quiz'],
  },

  // ── Research ──────────────────────────────────────────────────────────────
  {
    id: 'bt-research-topic',
    name: 'Research Overview',
    description: 'Get a structured overview of any topic',
    category: 'research',
    prompt: 'Provide a comprehensive research overview of: {{topic}}\n\nInclude:\n1. Brief definition/introduction\n2. Key concepts and principles\n3. Current state / latest developments\n4. Main debates or open questions\n5. Top resources for further reading\n\nTarget audience: {{audience}}',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'e.g., Transformer neural networks', required: true },
      { name: 'audience', label: 'Audience', placeholder: 'e.g., beginner / intermediate expert', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['research', 'overview', 'learning'],
  },
  {
    id: 'bt-fact-check',
    name: 'Fact Check',
    description: 'Verify claims and statements',
    category: 'research',
    prompt: 'Fact-check the following claims:\n\n{{claims}}\n\nFor each claim:\n1. Mark as TRUE / FALSE / PARTIALLY TRUE / UNCERTAIN\n2. Provide evidence or explanation\n3. Note any important nuances or context\n\nBe objective and cite specific reasons for each verdict.',
    variables: [
      { name: 'claims', label: 'Claims to Check', placeholder: 'Paste the claims here', required: true },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['fact-check', 'research', 'verification'],
  },

  // ── Debugging ─────────────────────────────────────────────────────────────
  {
    id: 'bt-debug-error',
    name: 'Debug Error Message',
    description: 'Interpret an error and get a fix',
    category: 'debugging',
    prompt: 'I\'m getting this error in my {{language}} code:\n\n```\n{{error}}\n```\n\nContext: {{context}}\n\nPlease:\n1. Explain what this error means\n2. Identify the most likely cause\n3. Provide a step-by-step fix\n4. Suggest how to prevent it in future',
    variables: [
      { name: 'language', label: 'Language/Framework', placeholder: 'e.g., TypeScript / React', required: true },
      { name: 'error', label: 'Error Message', placeholder: 'Paste the full error here', required: true },
      { name: 'context', label: 'Context', placeholder: 'What were you doing when this happened', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['debug', 'error', 'fix'],
  },
  {
    id: 'bt-performance',
    name: 'Performance Analysis',
    description: 'Identify and fix performance bottlenecks',
    category: 'debugging',
    prompt: 'Analyze the performance of this {{language}} code and suggest optimizations:\n\n```{{language}}\n{{code}}\n```\n\nCurrent issue: {{issue}}\n\nProvide:\n1. Identified bottlenecks\n2. Optimized version with changes highlighted\n3. Expected performance improvement\n4. Big-O complexity before and after',
    variables: [
      { name: 'language', label: 'Language', placeholder: 'python', required: true },
      { name: 'code', label: 'Code', placeholder: 'Paste your code here', required: true },
      { name: 'issue', label: 'Performance Issue', placeholder: 'e.g., takes 5s on 10k items', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['performance', 'optimization', 'debugging'],
  },
  {
    id: 'bt-regex',
    name: 'Build Regex',
    description: 'Create and explain a regular expression',
    category: 'coding',
    prompt: 'Create a regular expression for: {{description}}\n\nExamples of strings that should match:\n{{examples_match}}\n\nExamples that should NOT match:\n{{examples_no_match}}\n\nProvide:\n1. The regex pattern\n2. Explanation of each part\n3. Language-specific usage example ({{language}})',
    variables: [
      { name: 'description', label: 'What to Match', placeholder: 'e.g., email addresses', required: true },
      { name: 'examples_match', label: 'Should Match', placeholder: 'example1\nexample2', required: false },
      { name: 'examples_no_match', label: 'Should NOT Match', placeholder: 'counter-example1', required: false },
      { name: 'language', label: 'Language', placeholder: 'JavaScript', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['regex', 'coding', 'pattern'],
  },
  {
    id: 'bt-system-design',
    name: 'System Design',
    description: 'Design a system architecture',
    category: 'coding',
    prompt: 'Design a system for: {{requirements}}\n\nConstraints: {{constraints}}\nScale: {{scale}}\n\nProvide:\n1. High-level architecture diagram (ASCII)\n2. Key components and their responsibilities\n3. Data flow\n4. Technology stack recommendations\n5. Potential bottlenecks and solutions',
    variables: [
      { name: 'requirements', label: 'System Requirements', placeholder: 'e.g., URL shortener like bit.ly', required: true },
      { name: 'constraints', label: 'Constraints', placeholder: 'e.g., must be highly available', required: false },
      { name: 'scale', label: 'Expected Scale', placeholder: 'e.g., 1M users, 100k requests/day', required: false },
    ],
    isBuiltIn: true,
    usageCount: 0,
    tags: ['system-design', 'architecture', 'interview'],
  },
];
