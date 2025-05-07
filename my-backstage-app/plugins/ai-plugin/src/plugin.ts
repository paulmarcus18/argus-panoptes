import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const aiPluginPlugin = createPlugin({
  id: 'ai-plugin',
  routes: {
    root: rootRouteRef,
  },
});

export const AiPluginPage = aiPluginPlugin.provide(
  createRoutableExtension({
    name: 'AiPluginPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);

import { OpenAI } from 'openai';

const api_key = `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`;

const openai = new OpenAI({
  apiKey: api_key,
});

// Mock commit messages
const commitMessages = [
  'Fix bug in login logic when email is missing',
  'Refactor signup flow to use new auth API',
  'Update dependencies and remove deprecated packages',
  'Improve error logging in user service',
  'Add unit tests for checkout module',
];

const prompt = `
You are a release note generator. Given the following GitHub commit messages, summarize the changes in a clear, professional paragraph:

${commitMessages.map(msg => `- ${msg}`).join('\n')}
`;

async function generateSummary() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for generating concise release notes.' },
        { role: 'user', content: prompt },
      ],
    });

    const summary = response.choices[0].message.content;
    console.log('AI-Generated Summary:\n', summary);
  } catch (error) {
    console.error('Error generating summary:', error);
  }
}

generateSummary();
