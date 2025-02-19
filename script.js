import { generateCode, explainCode, reviewCode, commentCode } from './codegen.js';
import hljs from 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/es/highlight.min.js';

document.addEventListener('DOMContentLoaded', async () => {
  const room = new WebsimSocket();
  
  const executeButton = document.getElementById('execute');
  const outputDiv = document.getElementById('output');
  const languageSelect = document.getElementById('language');
  const descriptionTextarea = document.getElementById('description');
  const toneSelect = document.getElementById('tone');
  const modeSelect = document.getElementById('mode');
  const includeExplanationCheckbox = document.getElementById('includeExplanation');
  const modeOptions = document.getElementById('modeOptions');
  const titleText = document.getElementById('titleText');
  const generatorOptions = document.getElementById('generatorOptions');
  const commenterOptions = document.getElementById('commenterOptions');
  const descriptionLabel = document.getElementById('descriptionLabel');
  const customLanguageInput = document.getElementById('customLanguageInput');
  const customLanguageField = document.getElementById('customLanguage');
  const bodyElement = document.body;
  const containerElement = document.querySelector('.container');
  const subtitleElement = document.querySelector('.subtitle');
  const labels = document.querySelectorAll('label');
  const selectsAndTextareas = document.querySelectorAll('select, textarea');
  const checkbox = document.querySelector('.checkbox-group input[type="checkbox"]');
  const modeSwitchDiv = document.querySelector('.mode-switch');
  const customLanguageInputEl = document.querySelector('.custom-language-input input');
  const copyButton = document.querySelector('.copy-button');
  const commentMode = document.getElementById('commentMode');
  const commentSpecificity = document.getElementById('commentSpecificity');

  function updateUIForMode(mode) {
    const isExplainer = mode === 'explainer';
    const isReviewer = mode === 'reviewer';
    const isGenerator = mode === 'generator';
    const isCommenter = mode === 'commenter';
    
    bodyElement.classList.toggle('explainer-mode', isExplainer);
    bodyElement.classList.toggle('reviewer-mode', isReviewer);
    bodyElement.classList.toggle('generator-mode', isGenerator);
    bodyElement.classList.toggle('commenter-mode', isCommenter);
    containerElement.classList.toggle('explainer-mode', isExplainer);
    containerElement.classList.toggle('reviewer-mode', isReviewer);
    containerElement.classList.toggle('generator-mode', isGenerator);
    containerElement.classList.toggle('commenter-mode', isCommenter);
    subtitleElement.classList.toggle('explainer-mode', isExplainer);
    subtitleElement.classList.toggle('reviewer-mode', isReviewer);
    subtitleElement.classList.toggle('generator-mode', isGenerator);
    subtitleElement.classList.toggle('commenter-mode', isCommenter);
    labels.forEach(label => {
      label.classList.toggle('explainer-mode', isExplainer);
      label.classList.toggle('reviewer-mode', isReviewer);
      label.classList.toggle('generator-mode', isGenerator);
      label.classList.toggle('commenter-mode', isCommenter);
    });
    selectsAndTextareas.forEach(el => {
      el.classList.toggle('explainer-mode', isExplainer);
      el.classList.toggle('reviewer-mode', isReviewer);
      el.classList.toggle('generator-mode', isGenerator);
      el.classList.toggle('commenter-mode', isCommenter);
    });
    if(checkbox) {
      checkbox.classList.toggle('explainer-mode', isExplainer);
      checkbox.classList.toggle('reviewer-mode', isReviewer);
      checkbox.classList.toggle('generator-mode', isGenerator);
      checkbox.classList.toggle('commenter-mode', isCommenter);
    }
    modeSwitchDiv.classList.toggle('explainer-mode', isExplainer);
    modeSwitchDiv.classList.toggle('reviewer-mode', isReviewer);
    modeSwitchDiv.classList.toggle('generator-mode', isGenerator);
    modeSwitchDiv.classList.toggle('commenter-mode', isCommenter);
    if(customLanguageInputEl) {
      customLanguageInputEl.classList.toggle('explainer-mode', isExplainer);
      customLanguageInputEl.classList.toggle('reviewer-mode', isReviewer);
      customLanguageInputEl.classList.toggle('generator-mode', isGenerator);
      customLanguageInputEl.classList.toggle('commenter-mode', isCommenter);
    }
    executeButton.classList.toggle('explainer-mode', isExplainer);
    executeButton.classList.toggle('reviewer-mode', isReviewer);
    executeButton.classList.toggle('generator-mode', isGenerator);
    executeButton.classList.toggle('commenter-mode', isCommenter);
    if (copyButton) {
      copyButton.classList.toggle('explainer-mode', isExplainer);
      copyButton.classList.toggle('reviewer-mode', isReviewer);
      copyButton.classList.toggle('generator-mode', isGenerator);
      copyButton.classList.toggle('commenter-mode', isCommenter);
    }
    outputDiv.classList.toggle('explainer-mode', isExplainer);
    outputDiv.classList.toggle('reviewer-mode', isReviewer);
    outputDiv.classList.toggle('generator-mode', isGenerator);
    outputDiv.classList.toggle('commenter-mode', isCommenter);
  }
    
  modeOptions.addEventListener('change', (e) => {
    const selectedMode = e.target.value;
    titleText.textContent = `AI Code ${
      selectedMode === 'generator' ? 'Generator' : 
      selectedMode === 'explainer' ? 'Explainer' : 
      selectedMode === 'reviewer' ? 'Reviewer' : 
      'Commenter'
    }`;
    
    generatorOptions.classList.toggle('hidden', selectedMode !== 'generator');
    commenterOptions.classList.toggle('hidden', selectedMode !== 'commenter');
    
    descriptionLabel.textContent = selectedMode === 'generator'
      ? 'Description of Code to Generate/Modify:'
      : 'Code to ' + (
        selectedMode === 'explainer' ? 'Explain:' : 
        selectedMode === 'reviewer' ? 'Review:' : 
        'Comment:'
      );
    
    descriptionTextarea.placeholder = selectedMode === 'generator'
      ? 'Describe what you want the code to do...'
      : 'Paste the code you want to ' + (
        selectedMode === 'explainer' ? 'explain' : 
        selectedMode === 'reviewer' ? 'review' : 
        'comment'
      ) + '...';
    
    executeButton.querySelector('.button-text').textContent = 
      selectedMode === 'generator' ? 'Execute' : 
      selectedMode === 'explainer' ? 'Explain' : 
      selectedMode === 'reviewer' ? 'Review' : 
      'Comment';

    updateUIForMode(selectedMode);
  });

  let lastSelectedLanguage = languageSelect.value;
  let lastCustomInput = '';

  function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
  }
  
  // Load custom languages for current user
  async function loadCustomLanguages() {
    const customLanguages = room.collection('custom_language')
      .filter({ username: room.party.client.username })
      .getList();
    
    // Get the custom option element to insert before
    const customOption = languageSelect.querySelector('option[value="custom"]');
    
    // Clear any existing custom languages
    Array.from(languageSelect.options)
      .filter(option => option.dataset.isCustom === 'true')
      .forEach(option => option.remove());
    
    // Add custom languages before the "custom" option
    customLanguages.forEach(lang => {
      const option = new Option(lang.name, lang.name.toLowerCase());
      option.dataset.isCustom = 'true';
      languageSelect.insertBefore(option, customOption);
    });
  }

  // Initial load of custom languages
  await loadCustomLanguages();
  
  // Subscribe to changes in custom languages
  room.collection('custom_language').subscribe(() => {
    loadCustomLanguages();
  });

  languageSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customLanguageInput.classList.remove('hidden');
      customLanguageField.value = lastCustomInput;
      customLanguageField.focus();
    } else {
      customLanguageInput.classList.add('hidden');
      lastSelectedLanguage = e.target.value;
    }
  });

  customLanguageField.addEventListener('blur', (e) => {
    const customValue = e.target.value.trim();
    lastCustomInput = customValue;
    
    if (!customValue) {
      languageSelect.value = lastSelectedLanguage;
      customLanguageInput.classList.add('hidden');
    }
  });

  customLanguageField.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const customValue = customLanguageField.value.trim();
      lastCustomInput = customValue;
      
      if (customValue) {
        // Check if the language already exists in select
        const exists = Array.from(languageSelect.options).some(
          option => option.text.toLowerCase() === customValue.toLowerCase()
        );

        if (!exists) {
          // Save to multiplayer storage
          await room.collection('custom_language').create({
            name: customValue,
          });
          
          // Create and insert new option before the "custom" option
          const newOption = new Option(customValue, customValue.toLowerCase());
          newOption.dataset.isCustom = 'true';
          const customOption = languageSelect.querySelector('option[value="custom"]');
          languageSelect.insertBefore(newOption, customOption);
        }

        // Select the new/existing language
        languageSelect.value = customValue.toLowerCase();
        lastSelectedLanguage = customValue.toLowerCase();
        customLanguageInput.classList.add('hidden');
        customLanguageField.value = '';
      }
    }
  });

  // Add copy button functionality
  function addCopyButton(outputDiv, codeContent) {
    // Remove existing copy button if any
    const existingButton = outputDiv.querySelector('.copy-button');
    if (existingButton) {
      existingButton.remove();
    }

    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codeContent);
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('copied');
        
        setTimeout(() => {
          copyButton.textContent = 'Copy';
          copyButton.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
        copyButton.textContent = 'Failed to copy';
        
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      }
    });

    outputDiv.appendChild(copyButton);
    updateUIForMode(modeOptions.value);
  }

  executeButton.addEventListener('click', async () => {
    let language = languageSelect.value;
    const description = descriptionTextarea.value;
    const selectedMode = modeOptions.value;

    if (!description.trim()) {
      outputDiv.textContent = selectedMode === 'generator'
        ? 'Please provide a description of the code you want to generate.'
        : `Please provide code to ${
          selectedMode === 'explainer' ? 'explain' : 
          selectedMode === 'reviewer' ? 'review' : 
          'comment'
        }.`;
      return;
    }

    executeButton.classList.add('loading');
    outputDiv.textContent = selectedMode === 'generator' 
      ? 'Generating code...' 
      : selectedMode === 'explainer' 
        ? 'Analyzing code...' 
        : selectedMode === 'reviewer'
          ? 'Reviewing code...'
          : 'Adding comments...';
    
    try {
      let result;
      if (selectedMode === 'generator') {
        result = await generateCode(
          language, 
          description, 
          toneSelect.value, 
          modeSelect.value,
          includeExplanationCheckbox.checked
        );
      } else if (selectedMode === 'explainer') {
        result = await explainCode(language, description);
      } else if (selectedMode === 'reviewer') {
        result = await reviewCode(language, description);
      } else if (selectedMode === 'commenter') {
        result = await commentCode(
          language,
          description,
          commentMode.value,
          commentSpecificity.value
        );
      }
      
      if (selectedMode === 'generator') {
        let codeContent = result;
        if (includeExplanationCheckbox.checked && result.includes('\n\n/*\nExplanation:')) {
          codeContent = result.split('\n\n/*\nExplanation:')[0];
        }
        
        if (language.includes("html_css_javascript")) {
          language = "html";
        }
        let modifiedResult;
        if (language.includes("html")) {
          modifiedResult = escapeHtml(result);
        } else {
          // Don't escape if the result isn't primarily HTML
          modifiedResult = result;
        }
        outputDiv.innerHTML = `<pre><code class="language-${language}">${modifiedResult}</code></pre>`;
        hljs.highlightAll();
        
        addCopyButton(outputDiv, codeContent);
      } else {
        outputDiv.innerHTML = result;
      }
    } catch (error) {
      outputDiv.textContent = error.message || 'Error processing request. Please try again.';
      console.error("Error:", error);
    } finally {
      executeButton.classList.remove('loading');
    }
  });

  // Add enter key support for textarea
  descriptionTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      executeButton.click();
    }
  });
    
  // Initial UI setup based on modeOptions
  updateUIForMode(modeOptions.value);
});