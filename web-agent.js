import puppeteer from 'puppeteer';

let browser = null;
let page = null;

export async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--window-size=1280,800', '--start-maximized']
    });
    page = await browser.newPage();
  }
  return page;
}

export async function navigate(url) {
  if (!page) await initBrowser();
  if (!url.startsWith('http')) url = 'https://' + url;
  await page.goto(url, { waitUntil: 'networkidle2' });
  return await getSimplifiedDOM();
}

export async function click(elementId) {
  if (!page) return "No active browser.";
  try {
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-agent-id="${id}"]`);
      if (el) el.click();
    }, elementId);
    await new Promise(r => setTimeout(r, 2000)); // wait for navigation/renders
    return await getSimplifiedDOM();
  } catch (err) {
    return `Error clicking element ${elementId}: ${err.message}`;
  }
}

export async function type(elementId, text) {
  if (!page) return "No active browser.";
  try {
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-agent-id="${id}"]`);
      if (el) {
        el.focus();
        el.value = '';
      }
    }, elementId);
    
    // Type organically
    const el = await page.$(`[data-agent-id="${elementId}"]`);
    if (el) {
      await el.type(text, { delay: 50 });
      await new Promise(r => setTimeout(r, 500));
      return await getSimplifiedDOM();
    } else {
      return `Element ${elementId} not found.`;
    }
  } catch (err) {
    return `Error typing in element ${elementId}: ${err.message}`;
  }
}

export async function scroll(direction = 'down') {
  if (!page) return "No active browser.";
  try {
    if (direction === 'down') {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    } else {
      await page.evaluate(() => window.scrollBy(0, -window.innerHeight * 0.8));
    }
    await new Promise(r => setTimeout(r, 1500));
    return await getSimplifiedDOM();
  } catch (err) {
    return `Error scrolling: ${err.message}`;
  }
}

export async function getSimplifiedDOM(retries = 3) {
  if (!page) return "No active browser.";

  try {
    const domSnapshot = await page.evaluate(() => {
      // Inject IDs into interactive elements
      let idCounter = 1;
      const interactiveSelectors = 'a, button, input, textarea, select, [role="button"]';
      const elements = document.querySelectorAll(interactiveSelectors);
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          el.setAttribute('data-agent-id', `el-${idCounter++}`);
        }
      });

      function parseNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.replace(/\\s+/g, ' ');
          return text === ' ' ? ' ' : text.trim() ? text : '';
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return '';
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IFRAME', 'CANVAS'].includes(node.tagName)) return '';

          // Viewport culling: skip elements completely outside the viewport
          const rect = node.getBoundingClientRect();
          const inViewport = (
              rect.bottom >= 0 &&
              rect.right >= 0 &&
              rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
              rect.left <= (window.innerWidth || document.documentElement.clientWidth)
          );
          if (!inViewport && rect.width > 0 && rect.height > 0) return '';

          let inner = Array.from(node.childNodes).map(parseNode).join('');
          
          const isBlock = ['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'SECTION', 'ARTICLE', 'MAIN', 'NAV', 'HEADER', 'FOOTER'].includes(node.tagName);
          if (isBlock) inner = `\\n${inner.trim()}\\n`;

          const agentId = node.getAttribute('data-agent-id');
          if (agentId) {
            let label = inner.replace(/\\n/g, ' ').trim();
            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
              label = node.getAttribute('aria-label') || (node.labels && node.labels.length > 0 ? node.labels[0].innerText : '') || node.placeholder || node.name || 'text input';
              return `\\n- [INPUT] "${label}" (ID: ${agentId})\\n`;
            } else if (node.tagName === 'SELECT') {
              label = node.getAttribute('aria-label') || (node.labels && node.labels.length > 0 ? node.labels[0].innerText : '') || node.name || 'select';
              const selectedOption = node.options[node.selectedIndex];
              const selectedText = selectedOption ? selectedOption.text : '';
              return `\\n- [SELECT] "${label}" [Selected: ${selectedText}] (ID: ${agentId})\\n`;
            } else if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') {
              label = label || node.title || node.value || 'button';
              return `\\n- [BUTTON] "${label}" (ID: ${agentId})\\n`;
            } else if (node.tagName === 'A') {
              let cleanUrl = '';
              if (node.href) {
                try {
                  const urlObj = new URL(node.href);
                  cleanUrl = urlObj.origin + urlObj.pathname;
                } catch(e) { cleanUrl = node.href; }
              }
              label = label || node.title || cleanUrl || 'link';
              return `\\n- [LINK] "${label}" (ID: ${agentId})\\n`;
            }
          }
          
          if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName) && inner.trim()) {
            const level = node.tagName.charAt(1);
            return `\\n${'#'.repeat(parseInt(level))} ${inner.replace(/\\n/g, ' ').trim()}\\n`;
          }
          if (node.tagName === 'LI' && inner.trim()) {
            return `\\n- ${inner.replace(/\\n/g, ' ').trim()}\\n`;
          }
          if (node.tagName === 'P' && inner.trim()) {
            return `\\n${inner.trim()}\\n`;
          }
          
          return inner;
        }
        return '';
      }

      let markdown = parseNode(document.body);
      
      // Clean up excessive newlines
      markdown = markdown.replace(/\\n{3,}/g, '\\n\\n').trim();
      
      // Truncate to save tokens for local 8B models (approx 8000 chars)
      if (markdown.length > 8000) {
        markdown = markdown.substring(0, 8000) + '\\n...[TRUNCATED FOR LENGTH]';
      }
      return markdown;
    });
    
    return domSnapshot.substring(0, 8000) + (domSnapshot.length > 8000 ? "\n...[TRUNCATED]" : "");
  } catch (err) {
    if (retries > 0) {
      console.warn(`DOM extraction failed (${err.message}). Retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
      return await getSimplifiedDOM(retries - 1);
    }
    return `Error reading DOM: ${err.message}. The page might still be loading or has blocked the agent.`;
  }
}
