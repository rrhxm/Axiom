async function generateCode(language, description, tone, mode, includeExplanation) {
  const requestBody = {
    language,
    description,
    tone,
    mode,
    includeExplanation
  };
  
  try {
    const response = await fetch('/api/ai_completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: `You are a professional code generator. Generate code based on the following parameters:
        Language: ${language}
        Description: ${description}
        Tone: ${tone}
        Mode: ${mode}
        Include Explanation: ${includeExplanation}

        Rules:
        1. Return working, complete code that fulfills the description without any typos or grammar issues
        2. If mode is "multiple", provide 3 different implementations
        3. If mode is "shortest", provide the most concise implementation
        4. If mode is "complete", provide fully documented code with all edge cases handled
        5. If mode is "fullyimplemented", similarly to "complete" (but unchanged code is omitted), the generated code should and MUST be implemented completely without ANY placeholders.
        6. If includeExplanation is true, include detailed code explanation
        7. Use the specified programming language
        8. Format the response according to the interface below

        interface Response {
          code: string;
          explanation?: string;
          codes?: string[];
        }

        {
          "code": "function greet(name) {\n  return \`Hello \${name}!\`;\n}",
          "explanation": "This function takes a name parameter and returns a greeting string using template literals.",
          "codes": ["implementation1", "implementation2", "implementation3"]
        }`,
        data: requestBody
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || (!data.code && !data.codes)) {
      throw new Error('Invalid response format from AI');
    }

    // Format the response based on the mode
    if (mode === 'multiple' && Array.isArray(data.codes)) {
      return data.codes.map((code, index) => 
        `// Solution ${index + 1}:\n${code}`
      ).join('\n\n');
    }
    
    let result = data.code || '';
    
    // Add explanation if requested
    if (includeExplanation && data.explanation) {
      result += '\n\n/*\nExplanation:\n' + data.explanation + '\n*/';
    }
    
    return result;
  } catch (error) {
    console.error("Error in generateCode:", error);
    throw new Error(`Failed to generate code: ${error.message}`);
  }
}

async function explainCode(language, code) {
  try {
    const response = await fetch('/api/ai_completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: `You are a professional code explainer. Explain the following code in a clear and concise way.
        Make sure to:
        1. Explain the purpose of the code
        2. Break down complex parts
        3. Point out any potential issues or improvements
        4. Use clear, professional language
        5. Provide an improved version of the code that addresses the issues mentioned and should be implemented completely without any placeholders.
        
        Language: ${language}
        Code: ${code}

        Response format should be a clear explanation with HTML formatting for better readability.
        Use <h2> for main sections, <h3> for subsections, <p> for paragraphs, and <ul>/<ol> for lists.
        For the improved code section, wrap the code in <pre><code class="language-${language}"> tags.
        And most importantly, Format the response according to the interface below
        
        interface Response {
          explanation: string;
        }
        
        Example response:
        {
          "explanation": "<h2>Purpose</h2><p>This code implements a basic calculator function.</p><h2>Key Components</h2><ul><li>Takes two numbers as input</li><li>Performs basic arithmetic operations</li><li>Returns the result</li></ul><h2>Areas for Improvement</h2><ul><li>Input validation is missing</li><li>Error handling could be improved</li><li>The function is pure and has no side effects</li></ul><h2>Code with Potential Fixes/Improvements</h2><p>Here's an improved version of the code that addresses the issues mentioned above:</p><pre><code class=\\"language-javascript\\">function calculator(a, b, operation) {
            // Input validation
            if (typeof a !== 'number' || typeof b !== 'number') {
              throw new Error('Both inputs must be numbers');
            }
            
            // Operation validation
            if (!['add', 'subtract', 'multiply', 'divide'].includes(operation)) {
              throw new Error('Invalid operation');
            }
            
            // Division by zero check
            if (operation === 'divide' && b === 0) {
              throw new Error('Division by zero is not allowed');
            }
            
            // Perform calculation
            const operations = {
              add: (a, b) => a + b,
              subtract: (a, b) => a - b,
              multiply: (a, b) => a * b,
              divide: (a, b) => a / b
            };
            
            return operations[operation](a, b);
          }</code></pre>"
        }`,
        data: { language, code }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.explanation) {
      throw new Error('Invalid response format from AI');
    }
    
    return data.explanation;
  } catch (error) {
    console.error("Error in explainCode:", error);
    throw new Error(`Failed to explain code: ${error.message}`);
  }
}

async function reviewCode(language, code) {
  try {
    const response = await fetch('/api/ai_completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: `You are a professional code reviewer. Review the following code and provide a detailed analysis focusing on:
        1. Bugs and potential issues
        2. Code readability
        3. Scalability
        4. Performance and optimization
        5. Error handling
        6. Code style and structure
        7. Security concerns (if applicable)
        8. Testing considerations
        
        Provide a score from 0 to 10 based on these criteria, where:
        - 0-3: Poor quality, major issues
        - 4-6: Acceptable quality, needs improvement
        - 7-8: Good quality, minor issues
        - 9-10: Excellent quality
        
        Language: ${language}
        Code: ${code}

        Response format should be clear HTML with scoring. Use <h2> for main sections, <h3> for subsections, 
        <p> for paragraphs, and <ul>/<ol> for lists. Format the response according to the interface below.
        
        interface Response {
          review: string;
          score: number;
        }
        
        Example response:
        {
          "review": "<h2>Code Review Analysis</h2>
          <h3>Bugs and Potential Issues</h3>
          <ul><li>No major bugs found</li><li>Potential null reference in line 23</li></ul>
          
          <h3>Code Readability</h3>
          <ul><li>Good variable naming</li><li>Could use more comments</li></ul>
          
          <h3>Recommendations</h3>
          <ul><li>Add input validation</li><li>Implement error handling</li></ul>
          
          <div class='score high'>Score: 8/10</div>
          
          <h3>Improved Version</h3>
          <pre><code class='language-javascript'>// Improved code here...</code></pre>",
          "score": 8
        }`,
        data: { language, code }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.review || typeof data.score !== 'number') {
      throw new Error('Invalid response format from AI');
    }
    
    const scoreClass = data.score >= 7 ? 'high' : data.score >= 4 ? 'medium' : 'low';
    const reviewWithFormattedScore = data.review.replace(
      /<div class='score.*?'>/,
      `<div class='score ${scoreClass}'>`
    );
    
    return reviewWithFormattedScore;
  } catch (error) {
    console.error("Error in reviewCode:", error);
    throw new Error(`Failed to review code: ${error.message}`);
  }
}

async function commentCode(language, code, mode, specificity) {
  try {
    const response = await fetch('/api/ai_completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: `You are a professional code commenter. Add clear and helpful comments to the following code based on these parameters:
        Comment Mode: ${mode} (everywhere/necessary/definitions)
        Specificity: ${specificity} (concise/brief/somewhat/very)
        
        Rules:
        1. For "everywhere" mode, add comments for every meaningful block of code
        2. For "necessary" mode, only add comments where clarity is needed
        3. For "definitions" mode, focus on documenting classes, methods, and functions
        4. Follow language-specific documentation standards:
           - Python: Use docstrings with """ for classes/functions, # for inline
           - JavaScript: Use JSDoc for functions/classes, // for inline
           - Java/C++/C#: Use /** */ for classes/methods, // for inline
           - Ruby: Use =begin/=end for blocks, # for inline
           - PHP: Use /** */ for classes/methods, // or # for inline
        5. Match comment detail level to specified specificity:
           - Concise: One-line descriptions
           - Brief: Basic purpose and parameters
           - Somewhat: Include context and basic examples
           - Very: Full documentation with edge cases and detailed examples
        6. Keep comments professional and focused
        7. For existing comments/docstrings:
           - Enhance incomplete docstrings
           - Don't duplicate existing comments
           - Add additional context if needed
        8. Return the complete code with added comments
        9. Use appropriate docstring formats:
           - Python: Google style
           - JavaScript: JSDoc
           - Java: Javadoc
           - Others: Match common conventions
        
        Language: ${language}
        Code: ${code}

        Response format should include the commented code and a summary of changes.
        Format the response according to the interface below.
        
        interface Response {
          commentedCode: string;
          summary: string;
        }
        
        Example responses based on specificity:

        Concise:
        {
          "commentedCode": "// Authenticates user credentials\nfunction auth(user, pass) {\n  if (!user || !pass) return false;\n  return checkCreds(user, pass);\n}",
          "summary": "<h2>Comments Added</h2><ul><li>Added function purpose</li></ul>"
        }

        Very Specific:
        {
          "commentedCode": "/**\n * Authenticates user credentials against the database\n *\n * @param {string} user - Username (email or ID)\n * @param {string} pass - User's password (should be hashed)\n * @returns {boolean} True if credentials are valid\n *\n * @example\n * const isValid = auth('user@example.com', 'hashedPass123');\n *\n * @throws {InvalidCredentialsError} If credentials format is invalid\n */\nfunction auth(user, pass) {\n  // Validate input parameters\n  if (!user || !pass) {\n    throw new InvalidCredentialsError('Missing credentials');\n  }\n  \n  // Verify against database\n  return checkCreds(user, pass);\n}",
          "summary": "<h2>Documentation Added</h2><ul><li>Added comprehensive JSDoc documentation</li><li>Added parameter validation comments</li><li>Added database operation comment</li></ul>"
        }`,
        data: { language, code, mode, specificity }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.commentedCode || !data.summary) {
      throw new Error('Invalid response format from AI');
    }
    
    return `
      ${data.summary}
      <h3>Commented Code</h3>
      <pre><code class="language-${language}">${data.commentedCode}</code></pre>
    `;
  } catch (error) {
    console.error("Error in commentCode:", error);
    throw new Error(`Failed to add comments to code: ${error.message}`);
  }
}

export { generateCode, explainCode, reviewCode, commentCode };