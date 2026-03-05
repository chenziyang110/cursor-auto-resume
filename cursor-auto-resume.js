// Ultra-simple Cursor Auto Resume Script - 支持 Network Error / Unexpected seqno
(function() {
    console.log('Cursor Auto Resume: Running');
    
    let lastClickTime = 0;
    let startTime = Date.now();
    const maxDuration = 30 * 60 * 1000;
    let intervalId;
    
    function click_reset() {
        startTime = Date.now();
        console.log('Cursor Auto Resume: Timer reset');
    }
    window.click_reset = click_reset;
    
    function clickResumeLink() {
        const now = Date.now();
        if (now - startTime > maxDuration) {
            console.log('Cursor Auto Resume: 30 minutes elapsed, stopping');
            clearInterval(intervalId);
            return;
        }
        if (now - lastClickTime < 3000) return;
        
        // === 新增：Network Error / Unexpected seqno 弹窗（先匹配，优先处理）===
        const popup = document.querySelector('.composer-warning-popup');
        if (popup) {
            const isNetworkError = popup.querySelector('.composer-error-title')?.textContent?.includes('Network Error');
            const hasUnexpectedSeqno = popup.textContent && popup.textContent.includes('Unexpected seqno');
            const resumeBtn = popup.querySelector('#resume') || 
                Array.from(popup.querySelectorAll('[class*="composer-warning-button"]')).find(el => el.textContent.trim() === 'Resume');
            if ((isNetworkError || hasUnexpectedSeqno) && resumeBtn) {
                console.log('Cursor Auto Resume: Clicking Resume for Network Error / Unexpected seqno');
                resumeBtn.click();
                lastClickTime = now;
                return;
            }
        }
        
        // === 通用兜底：任意 composer 弹窗里的 Resume 按钮 ===
        const anyResume = document.querySelector('.composer-warning-popup #resume, .composer-warning-popup [class*="composer-warning-button"]');
        if (anyResume && anyResume.textContent.trim() === 'Resume') {
            console.log('Cursor Auto Resume: Clicking Resume (generic popup)');
            anyResume.click();
            lastClickTime = now;
            return;
        }
        
        // --- Scenario 1: "stop the agent after..." ---
        const markdownSection = document.querySelector('section[data-markdown-raw*="stop the agent after"]');
        if (markdownSection) {
            const resumeLink = markdownSection.querySelector('span.markdown-link[data-link*="composer.resumeCurrentChat"]');
            if (resumeLink && resumeLink.textContent.trim() === 'resume the conversation') {
                console.log('Clicking "resume the conversation" link (markdown section)');
                resumeLink.click();
                lastClickTime = now;
                return;
            }
        }
        
        const toolLimitXpath = document.evaluate(
            "//text()[contains(., 'stop the agent after') or contains(., 'Note: By default, we stop')]",
            document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null
        );
        for (let i = 0; i < toolLimitXpath.snapshotLength; i++) {
            const textNode = toolLimitXpath.snapshotItem(i);
            const el = textNode.parentElement;
            if (!el || !el.textContent) continue;
            const text = el.textContent;
            const hasRateLimitText = /stop the agent after \d+ tool calls/i.test(text) || text.includes('Note: By default, we stop');
            if (hasRateLimitText) {
                const section = el.closest('section') || el;
                const links = section.querySelectorAll('a, span.markdown-link, [role="link"], [data-link]');
                for (const link of links) {
                    if (link.textContent.trim() === 'resume the conversation') {
                        console.log('Clicking "resume the conversation" link (fallback)');
                        link.click();
                        lastClickTime = now;
                        return;
                    }
                }
            }
        }
        
        // --- Scenarios 2 & 3: 其他错误文案 ---
        const chatWindow = document.querySelector("div[class*='composer-bar']")?.closest("div[class*='full-input-box']");
        if (!chatWindow) return;

        const errorScenarios = [
            { errorText: "We're having trouble connecting to the model provider", buttonText: 'Resume', logMessage: 'Clicking "Resume" for connection error.' },
            { errorText: "We're experiencing high demand for", buttonText: 'Try again', logMessage: 'Clicking "Try again" for high demand.' },
            { errorText: "Connection failed. If the problem persists, please check your internet connection", buttonText: 'Try again', logMessage: 'Clicking "Try again" for connection failed.' }
        ];

        for (const scenario of errorScenarios) {
            const errorXpath = `.//section[contains(@data-markdown-raw, "${scenario.errorText}")] | .//div[contains(., "${scenario.errorText}")] | .//span[contains(., "${scenario.errorText}")]`;
            const errorEl = document.evaluate(errorXpath, chatWindow, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
            if (errorEl) {
                const buttonXpath = `(.//div[contains(@class, 'anysphere-secondary-button')]//span[text()='${scenario.buttonText}']/.. | .//button[contains(., '${scenario.buttonText}')])[last()]`;
                const button = document.evaluate(buttonXpath, chatWindow, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;
                if (button) {
                    console.log(scenario.logMessage);
                    button.click();
                    lastClickTime = now;
                    return;
                }
            }
        }
    }
    
    intervalId = setInterval(clickResumeLink, 1000);
    clickResumeLink();
    console.log('Cursor Auto Resume: Running (30 min). click_reset() to reset timer.');
})();