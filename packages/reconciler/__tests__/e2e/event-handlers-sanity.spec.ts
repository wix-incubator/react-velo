import puppeteer from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

const sleep = async (seconds: number) => await new Promise(resolve => setTimeout(resolve, seconds * 1000));

describe('event handlers sanity', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            //devtools: true,
            //slowMo: 100,
        });
    }, 30000);

    it('should call proper event handlers', async () => {
        const getCounterText = () => Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map((el) => (el as HTMLElement).innerText)[0];

        const waitForCounterValue = (value: number) => {
            return Array.from(document.querySelectorAll('[data-testid="richTextElement"]'))
            .map(el => (el as HTMLElement).innerText)
            .map(s => {
                const match = s.match(/\d+/);
                if (match) {
                    return parseInt(match[0], 10);
                }
            }).filter(i => i !== null)[0] === value;
        }

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/event-handlers-sanity');
        const toggleButton = await page.$('button[aria-label="Toggle"]');
        const switchColorButton = await page.$('button[aria-label="Switch Color"]');

        if (!toggleButton) {
            throw new Error(`Unable to find toogle button`);
        }

        if (!switchColorButton) {
            throw new Error(`Unable to find switchColorButton button`);
        }
        
        await switchColorButton.click();

        // wait for counter value = 1
        await page.waitForFunction(waitForCounterValue, {}, 1);

        await switchColorButton.click();

        // wait for counter value = 2
        await page.waitForFunction(waitForCounterValue, {}, 2);

        let clicksTodo = 5;
        do {
            await toggleButton.click();
            await sleep(1);
            clicksTodo--;
        } while(clicksTodo > 0);

        const counterText = await page.evaluate(getCounterText);
        expect(counterText).toBe('Clicked 2 times');
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
