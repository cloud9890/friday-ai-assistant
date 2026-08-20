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
        if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
        if (node.nodeType === Node.ELEMENT_NODE) {
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return '';
          if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'NOSCRIPT' || node.tagName === 'SVG') return '';

          let inner = Array.from(node.childNodes).map(parseNode).filter(t => t).join(' ');
          const agentId = node.getAttribute('data-agent-id');
          if (agentId) {
            let label = inner;
            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
              label = `[INPUT: ${node.placeholder || node.name || 'text'}]`;
            } else if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') {
              label = `[BUTTON: ${inner || node.title || node.value || 'submit'}]`;
            } else if (node.tagName === 'A') {
              label = `[LINK: ${inner || node.title || node.href}]`;
            }
            return ` {ID: ${agentId}, ${label}} `;
          }
          return inner;
        }
        return '';
      }
      return parseNode(document.body).replace(/\s+/g, ' ').trim();
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
