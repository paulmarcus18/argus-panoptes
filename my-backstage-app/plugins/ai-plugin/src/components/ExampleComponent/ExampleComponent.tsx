import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { GoogleGenAI } from '@google/genai';  // Import the GoogleGenAI package

// Initialize GoogleGenAI with your API key
const ai = new GoogleGenAI({ apiKey: "AIzaSyAGvFE_8fGwGtBNzSL8_x6lbxaj24xUOBE" });

const commitMessages = [
  'Fix bug in login logic when email is missing',
  'Refactor signup flow to use new auth API',
  'Update dependencies and remove deprecated packages',
  'Improve error logging in user service',
  'Add unit tests for checkout module',
];

// Build the prompt to generate the summary
const prompt = `
You are a release note generator. Given the following GitHub commit messages, summarize the changes in a clear, professional paragraph:

${commitMessages.map(msg => `- ${msg}`).join('\n')}
`;

export const ExampleComponent = () => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateSummary = async () => {
      try {
        // Make a request to the Gemini API via the GoogleGenAI package
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',  // Specify the correct model name here
          contents: prompt,           // Pass the prompt to the API
        });

        // Extract the text from the API response
        const result = response.text || 'No summary returned.';
        setSummary(result);  // Set the result into state
      } catch (error) {
        console.error('Error generating summary:', error);
        setSummary('❌ Error generating summary.');
      } finally {
        setLoading(false);  // Turn off loading state
      }
    };

    // Trigger the summary generation when the component mounts
    generateSummary();
  }, []);  // Empty dependency array ensures the effect runs only once

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">AI-Generated Summary</Typography>
        {loading ? <CircularProgress /> : <Typography>{summary}</Typography>}
      </CardContent>
    </Card>
  );
};
