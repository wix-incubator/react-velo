import puppeteer from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

describe('sanity for element instance count', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            // devtools: true,
            // slowMo: 100,
        });
    }, 30000);

    it('should create a single instance per component', async () => {
        const waitForCounterValue = (value: number) => {
            return Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map(el => (el as HTMLElement).innerText).map(s => s.match(/\d+/)).filter(match => !!match).map(match => parseInt(match![0], 10))[0] === value;
        }

        const consoleMessages: string[] = [];
        const CREATE_INSTANCE_MESSAGE_PREFIX = 'createInstance() instanceId:';
        const pageConsoleHandler = (event: puppeteer.ConsoleMessage) => {
            if (event.text().startsWith(CREATE_INSTANCE_MESSAGE_PREFIX)) {
                consoleMessages.push(event.text());
            }
        };

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/verify-instance-count', pageConsoleHandler);
        const increment = await page.$('button[aria-label=Star]');

        if (!increment) {
            throw new Error(`Unable to find star button`);
        }
        
        await increment.click();
        await page.waitForFunction(waitForCounterValue, {}, 1);
        await increment.click();
        await page.waitForFunction(waitForCounterValue, {}, 2);
        await increment.click();
        await page.waitForFunction(waitForCounterValue, {}, 3);
        await increment.click();
        await page.waitForFunction(waitForCounterValue, {}, 4);

        expect(consoleMessages.length).toBe(2);

        const buttonCreateInstanceMessage = consoleMessages.find(st => st.includes('type: button'));
        const textCreateInstanceMessage = consoleMessages.find(st => st.includes('type: text'));
        expect(buttonCreateInstanceMessage).not.toBeNull();
        expect(textCreateInstanceMessage).not.toBeNull();
    }, 60000);

    it('should not create new instances of repeater', async () => {
        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/verify-instance-count-repeater');
        const selectButtons = await page.$$('button[aria-label=Select]');

        if (!selectButtons) {
            throw new Error(`Unable to find select buttons`);
        }
        
        const waitForStateValueBecomingTrue = (index: number) => {
            return Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map(el => (el as HTMLElement).innerText)[index] === 'State value is: true';
        }

        await selectButtons[0].click();
        await page.waitForFunction(waitForStateValueBecomingTrue, {}, 1);

        await selectButtons[1].click();
        await page.waitForFunction(waitForStateValueBecomingTrue, {}, 3);

        const allTextValues = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map(el => (el as HTMLElement).innerText));

        expect(allTextValues).toEqual([
            "one",
            "State value is: true",
            "two",
            "State value is: true",
            "three",
            "State value is: false",
        ]);
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
